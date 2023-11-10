//
// an implementation of the actual ARVM VM
//

// some important rules that may allow you
// to execute or reason about a tape:
//
//   * no new 'abs'-valued operands can be
//   generated at runtime. You can, therefore,
//   index them before execution starts.
//
//   * 'feed' may not store the addr of fresh tape
//   into a register. therefore, the first reference
//   to tape must appear before the fresh tape itself.
//
//   * execution must begin with a valid frame pointer.
//   without a valid frame pointer, execution cannot
//   return on a context switch.
//
//   * execution begins at a block boundary. execution
//   continues in a block until an alice opcode.

// several functions operate on a parameter 'regs'.
// regs holds the registers of the virtual machine.
// the core ARVM has three registers:
//   'pc': the program counter
//   'fp': the frame pointer
//   'r1': the scratch register r1
//   'r2': the scratch register r2
// this implementation of the ARVM adds a register:
//   'deferred': this is a pointer to the first
//   uncompleted 'deferred' object in the virtual
//   machine tape

mkregs = function(pc, fp, r, threads, deferred) {
	return {
		pc: pc,
		fp: fp,
		r1: r,
		r2: 0,
		threads: threads,
		deferred: deferred
	};
};

dupregs = function(regs) {
	return {
		pc: regs.pc,
		fp: regs.fp,
		r1: regs.r1,
		r2: regs.r2,
		threads: regs.threads,
		deferred: regs.deferred
	};
};

// most functions operate on a parameter 'vml'. vml is
// the tape of the virtual machine. Each tape entry is
// an object with at least the field 'kind'. Several
// field kinds are defined:
// 'log':
//   these are debugging messages thrown into the log.
//   the message is available as a string at .val
// 'debug':
//   these throw a message into the log when executed.
//   the message is available as a strings at .msg
// 'deferred':
//   these are parked threads. each deferred entry has:
//     pc:
//       the value of the program counter where execution
//       stopped
//     fp:
//       the value of the frame pointer where execution
//       stopped
//     r1:
//       the value of the r1 register where execution
//       stopped
//     r2:
//       the value of the r2 register where execution
//       stopped
//     blocked:
//       the piece of blank tape where execution stopped
//     completed:
//       whether or not this deferred thread has been restarted
//     next:
//	 next points forward to the next deferred.
// 'blank':
//   these are blank spaces in the tape. Execution halts
//   if the program counter lands here or if an instruction
//   attempts to read here. 
// 'frame':
//   these are 'allocations' in the tape. Each has a field:
//     size: how many tape positions are allocated
// 'op':
//   these are 'opcodes'. The operator is available in
//   .val. The operators are
//   'alice':
//	halt the current thread. the runtime may pivot to
//      another thread. You can get anything you want at
//      Alice's restaurant, excepting Alice.
//   'feed':
//     feed arg2_seg[arg2] spaces into tape. write the
//     location into arg1_seg[arg1]. New tape spaces hold
//     'blank' entries
//     .arg1: .arg1_seg: .arg2: .arg2_seg:
//   'set':
//     arg1_seg[arg1] = arg2_seg[arg2]
//   'call':
//     foreign function call
//     the label of the foreign symbol is stored in the .target
//     property on the tape entry. frame for the call is
//     arg1_seg[arg1].
//   'fork':
//     create a new thread with fp = arg1_seg[arg1] and pc arg2_seg[arg2]
//     ARVM doesn't have subroutine call. Only fork.
// 'sz':
//   these are literal values for the feed opcode
// 'addr':
//   these are literal addresses
// 'lit':
//   these are simple literals

vmlog = function(vml, msg) {
	arlog(msg);
	vml.push({ kind: "log", val: msg});
}

// scan forward from a deferred with an unfilled next to
// the next deferred. return the vml index of the next deferred
// or false of there is no next deferred
var fixup = function(vml, danglingp) {
	var x;

	for(x = danglingp + 1 ; x < vml.length ; x++) {
		if(vml[x].kind == "deferred") {
			//vmlog(vml, 'fixing up dangling next at ' + danglingp + ' to ' + x);
			vml[danglingp].next = x;
			return x;
		}
	}
	//vmlog(vml, 'failed to fixup dangling next at ' + danglingp + '. is this the last deferred?');
	return false;
};

// context switch does not save the current vmregs.
context_switch = function(vml, vmregs) {
	var d, dp, x;
	var skipped;
	var fincount;

	skipped = 0;
	fincount = 0;

	//vmlog(vml, "context switching from deferred " + vmregs.deferred);

	//vmlog(vml, "context switch: deferred=" + vmregs.deferred + ' (' + JSON.stringify(vml[vmregs.deferred]) + ')');

	if(!vmregs.deferred) {
		vmlog(vml, 'no deferred pointer');
		return false;
	}

	dp = vmregs.deferred;

	while(1) {

		if(!dp) {
			//vmlog(vml, 'dp is unset');
			return false;
		}

		if(dp >= vml.length) {
			vmlog(vml, 'context-switch: deferred (' + dp + ') points past end of tape');
			return false;
		}

		d = vml[dp];

		if(d.kind != "deferred") {
			vmlog(vml, 'context-switch: deferred (' + dp + ') points to a non-deferred: ' + JSON.stringify(d));
			return false;
		}

		if(d.completed) {
			fincount++;
			//vmlog(vml, 'context-switch: passing a completed deferred at ' + dp);
			if(!d.next) {
				//vmlog(vml, 'next unset on completed deferred. fixing up.');
				dp = fixup(vml, dp);
				//vmlog(vml, 'next now points to ' + d.next);
				continue;
			} else {
				dp = d.next;
				//vmlog(vml, 'deferred dp is now ' + dp);
				if(!skipped) {
					//vmlog(vml, 'context_switch: promoting deferred from ' + vmregs.deferred + ' to ' + dp);
					//if(dp == 799) {
						//vmlog(vml, 'this is it!');
					//}
					vmregs.deferred = dp;
				}
			}
			continue;
		}

		//vmlog(vml, 'deferred thread at ' + dp + ' blocked on addr ' + d.blocked + ' completed: ' + d.completed);
		if(d.blocked >= vml.length) {
			vmlog(vml, 'context-switch: blocking address is past end of tape');
			// this is not actually an error. it just means we haven't gotten there yet
			skipped = 1;
			dp = d.next;
			if(!dp) {
				vmlog(vml, 'next unset on past tape');
				dp = fixup(vml, dp);
			}
			continue;
		}

		if(!vml[d.blocked] || (vml[d.blocked].kind == "blank")) {
			//vmlog(vml, 'context-switch: skipping deferred thread at ' + dp + ' wants: ' + JSON.stringify(d.blocked));
			skipped = 1;
			if(!d.next) {
				//vmlog(vml, 'next unset skipped deferred');
				dp = fixup(vml, dp);
				continue;
			}
			dp = d.next;
			continue;
		}

		if(!vml[d.fp] || (vml[d.fp].kind == "blank")) {
			vmlog(vml, 'context-switch: skipping deferred thread (blocked on fp) at ' + dp);
			skipped = 1;
			if(!d.next) {
				//vmlog(vml, 'next unset skipped deferred');
				dp = fixup(vml, dp);
				continue;
			}
			vmlog(vml, 'scanning forward to ' + dp);
			dp = d.next;
			continue;
		}

		if(vml[d.fp].kind != "frame") {
			vmlog(vml, 'deferred at ' + dp + ': frame must be a frame');
			return false;
		}

		//vmlog(vml, 'context_switch restarting from deferred at ' + dp + ' pc=' + d.pc + '  fp: ' + d.fp + ' r1: ' + d.r1 + ' r2: ' + d.r2);
		vmregs.pc = d.pc;
		vmregs.fp = d.fp;
		vmregs.r1 = d.r1;
		vmregs.r2 = d.r2;

		//vmlog(vml, 'context-switch: passed ' + fincount + ' completed deferreds');

		d.completed = 1;
		if(!skipped) {
			if(!d.next) {
				fixup(vml, dp);
			}
			if(d.next) {
				//vmlog(vml, 'foo context_switch: promoting deferred from ' + vmregs.deferred + ' to ' + d.next);
				//if(d.next == 799) {
					//vmlog(vml, 'this is it!');
				//}
				vmregs.deferred = d.next;
			}
		} else if(fincount > 10) {
			//vmlog(vml, "we have passed more than 10 completed continuations while looking for one to activate, but we skipped at least one uncompleted");

			if(!d.next) {
				fixup(vml, dp);
			}
			// this is where the error is!!!
			if(d.next) {
				//vmlog(vml, 'context_switch: rolling over deferred');
				if(!vml[vmregs.deferred].completed) {
					vml.push({
						kind: "deferred",
						pc: vml[vmregs.deferred].pc,
						fp: vml[vmregs.deferred].fp,
						r1: vml[vmregs.deferred].r1,
						r2: vml[vmregs.deferred].r2,
						blocked: vml[vmregs.deferred].blocked,
						completed: 0,
						next: 0,
						rolled_from: vmregs.deferred
					});

					vml[vmregs.deferred].completed = 1;
					// vmlog(vml, 'bar context_switch: promoting deferred from ' + vmregs.deferred + ' to ' + d.next);
					//if(d.next = 799) {
					//	vmlog(vml, 'this is it!');
					//}

					//vmregs.deferred = d.next;

					var c;
					d = vml[c = vmregs.deferred];
					while(d.completed && d.next)
						d = vml[c = d.next];
					//vmlog(vml, 'bar context_switch: promoting deferred from ' + vmregs.deferred + ' to ' + c);
					vmregs.deferred = c;
				}
			}
		}

		return true;
	}
	vmlog(vml, 'foo');
};

// advance an ARVM represented by { vml, vmregs } by a single step
// syms is an object that represents the possible foreign
// function targets. syms is indexed by the .target property
// on the 'call' tape object. On 'call', symbol will be resolved.
// the symbol's 'handler' property will be called and passed
// the vml and the vml index of a call frame.
//
// step returns false if a step was not possible. In this case,
// the last element of the vml should be a log message. step
// returns non-false when a step was possible.

var defer = function(addr, vml, vmregs) {
	var x, dd;
	vml.push({
		kind: "deferred",
		pc: vmregs.pc,
		fp: vmregs.fp,
		r1: vmregs.r1,
		r2: vmregs.r2,
		blocked: addr,
		completed: 0,
		next: 0,
	});
	dd = vml.length - 1;
	//vmlog(vml, 'deferred ' + JSON.stringify(vml[dd]));
	// let context switch sort this all out
	/*
	if((d = vml[vmregs.deferred]).kind == "deferred") {
		vmlog(vml, "we have a valid deferred at " + vmregs.deferred);
		if(!d.next) {
			vmlog(vml, "this deferred (" + vmregs.deferred + ") has no next. assigning one. (" + dd + ')');
			d.next = dd;
		} else {
			vmlog(vml, "whoa! stale deferred register at " + vmregs.deferred);
		}
	}
	vmlog(vml, "bogobogo. advancing deferred from " + vmregs.deferred + " to " + (vml.length - 1));
	vmregs.deferred = vml.length - 1;
	*/
	if(!context_switch(vml, vmregs)) {
		//vmlog(vml, 'no available contexts');
		return false;
	}
	return true;
};

step = function(vml, vmregs, syms) {
	var pc, i, d;

	//vmlog(vml, 'stepping pc: ' + vmregs.pc + ' regs: ' + JSON.stringify(vmregs));

	pc = vmregs.pc;
	if(pc >= vml.length) {
		vmlog(vml, 'pc past end of tape');
		return defer(pc, vml, vmregs);
	}

	i = vml[pc];
	if(!i || (i.kind=='blank') ) {
		vmlog(vml, 'execution blocked on blank tape');
		return defer(pc, vml, vmregs);
	}

	if(i.kind == "debug") {
		vmlog(vml, 'debug: ' + i.msg + ' (pc:' + vmregs.pc + ':fp:' + vmregs.fp + ':r1:' + vmregs.r1 + ':r2:' + vmregs.r2 + ')');
		vmregs.pc++;
		return true;
	}

	if(i.kind != "op") {
		vmregs.pc++;
		return true;
	}

	switch(i.val) {
	case "alice":
		//vmlog(vml, 'halting thread at pc ' + vmregs.pc);
		if(!context_switch(vml, vmregs)) {
			vmlog(vml, 'context_switch: no available contexts');
			return false;
		}
		return true;
		break;
	case "feed":
		var a1_addr, a2, a2_addr, x, l, s;

		//vmlog(vml, 'feeding into');

		if(i.arg1_seg == "fp") {
			//vmlog(vml, 'fp relative dest');
			a1_addr = vmregs.fp + i.arg1 + 1;
		} else if(i.arg1_seg == "r1") {
			//vmlog(vml, 'r1 relative dest');
			a1_addr = vmregs.r1 + i.arg1 + 1;
		} else if(i.arg1_seg == "r2") {
			//vmlog(vml, 'r2 relative dest');
			a1_addr = vmregs.r2 + i.arg1 + 1;
		} else if(i.arg1_seg == "pc") {
			//vmlog(vml, 'pc relative dest');
			a1_addr = vmregs.pc + i.arg1;
		} else if(i.arg1_seg == "abs") {
			//vmlog(vml, 'abs relative dest');
			a1_addr = i.arg1;
		} else if(i.arg1_seg == "reg") {
			vmlog(vml, 'cant feed into register');
			return false;
		} else {
			vmlog(vml, 'unknown segment ' + i.arg1_seg + ' for feed dest');
			return false;
		}

		if(i.arg2_seg == "fp") {
			//vmlog(vml, 'fp relative size');
			s = vml[vmregs.fp].size;
			if(!s || (i.arg2 >= s)) {
				vmlog(vml, 'error: read past end of segment');
				return false;
			}
			a2_addr = vmregs.fp + i.arg2 + 1;
		} else if(i.arg2_seg == "r1") {
			//vmlog(vml, 'r relative size');
			s = vml[vmregs.r1].size;
			if(!s || (i.arg2 >= s)) {
				vmlog(vml, 'error: read past end of segment');
				return false;
			}
			a2_addr = vmregs.r1 + i.arg2 + 1;
		} else if(i.arg2_seg == "r2") {
			//vmlog(vml, 'r2 relative size');
			s = vml[vmregs.r2].size;
			if(!s || (i.arg2 >= s)) {
				vmlog(vml, 'error: read past end of segment');
				return false;
			}
			a2_addr = vmregs.r2 + i.arg2 + 1;
		} else if(i.arg2_seg == "pc") {
			//vmlog(vml, 'pc relative size');
			a2_addr = vmregs.pc + i.arg2;
		} else if(i.arg2_seg == "abs") {
			//vmlog(vml, 'abs relative size');
			a2_addr = i.arg2;
		} else {
			vmlog(vml, 'unknown segment for feed size');
			return false;
		}

		if(a2_addr >= vml.length) {
			vmlog(vml, 'feed: size past end of tape');
		}
		a2 = vml[a2_addr];

		if(!a2 || (a2.kind=='blank') ) {
			vmlog(vml, 'feed: size blank');
			return defer(a2_addr, vml, vmregs);
		}

		if(a2.kind != "sz") {
			vmlog(vml, 'non-sz argument for feed size');
			return false;
		}
		a2 = a2.val;

		if(a1_addr >= (vml.length + a2 )) {
			vmlog(vml, 'feed dest address past end of tape');
			return false;
		}

		//vmlog(vml, 'feeding ' + a2 + ' spaces');

		// lock the vml
		l = vml.length;
		vml.push({ kind: "frame", size: a2 });
		for(x = 0 ; x < a2 ; x++) {
			vml.push({kind: "blank"});
		}
		// unlock the vml

		if(vml[a1_addr] && (vml[a1_addr].kind != "blank")) {
			vmlog(vml, 'cannot write frame address to written tape');
			return false;
		}

		vml[a1_addr] = {kind: "addr", val: l};

		vmregs.pc++;
		return true;
		break;
	case "set":
		var a1_addr, a2, a2_addr, x, l, s;

		if(i.arg2_seg == "fp") {
			s = vml[vmregs.fp].size;
			if(!s || (i.arg2 >= s)) {
				vmlog(vml, 'error: set: read past end of segment');
				return false;
			}
			a2_addr = vmregs.fp + i.arg2 + 1;
		} else if(i.arg2_seg == "r1") {
			s = vml[vmregs.r1].size;
			if(!s || (i.arg2 >= s)) {
				vmlog(vml, 'error: set: read past end of segment');
				return false;
			}
			a2_addr = vmregs.r1 + i.arg2 + 1;
		} else if(i.arg2_seg == "r2") {
			s = vml[vmregs.r2].size;
			if(!s || (i.arg2 >= s)) {
				vmlog(vml, 'error: set: read past end of segment');
				return false;
			}
			a2_addr = vmregs.r2 + i.arg2 + 1;
		} else if(i.arg2_seg == "pc") {
			a2_addr = vmregs.pc + i.arg2;
		} else if(i.arg2_seg == "abs") {
			a2_addr = i.arg2;
		} else if(i.arg2_seg == "reg") {
			vmlog(vml, 'nah. you do not want to source a register');
			return false;
		} else {
			vmlog(vml, 'unknown segment ' + i.arg2_seg + ' for set source');
			return false;
		}

		if(a2_addr >= vml.length) {
			vmlog(vml, 'set: source past end of tape');
		}
		a2 = vml[a2_addr];

		if(!a2 || (a2.kind=='blank') ) {
			//vmlog(vml, 'set: source blank');
			return defer(a2_addr, vml, vmregs);
		}

		if(a2.kind=='frame') {
			vmlog(vml, "cannot move a frame");
			return false;
		}

		if(i.arg1_seg == "reg") {
			//vmlog(vml, 'setting into reg ' + i.arg1);

			if(i.arg1 == "r1") {
				if(a2.kind != "addr") {
					vmlog(vml, "can only put kind addr into reg");
					return false;
				}
				vmregs.r1 = a2.val;
				vmregs.pc = vmregs.pc + 1;
				return true;
				break;
			} else if(i.arg1 == "r2") {
				if(a2.kind != "addr") {
					vmlog(vml, "can only put kind addr into reg");
					return false;
				}
				vmregs.r2 = a2.val;
				vmregs.pc = vmregs.pc + 1;
				return true;
				break;
			} else {
				vmlog(vml, 'cant set register ' + i.arg1);
				return false;
			}
		} else if(i.arg1_seg == "fp") a1_addr = vmregs.fp + i.arg1 + 1;
		else if(i.arg1_seg == "r1") a1_addr = vmregs.r1 + i.arg1 + 1;
		else if(i.arg1_seg == "r2") a1_addr = vmregs.r2 + i.arg1 + 1;
		else if(i.arg1_seg == "pc") a1_addr = vmregs.pc + i.arg1;
		else if(i.arg1_seg == "abs") a1_addr = i.arg1;
		else {
			vmlog(vml, 'unknown segment ' + i.arg1_seg + ' for set dest');
			return false;
		}

		//vmlog(vml, 'pc: ' + vmregs.pc + ' setting into absolute addr ' + a1_addr);

		if(a1_addr >= vml.length) {
			vmlog(vml, 'pc: ' + vmregs.pc + ' set dest address (' + a1_addr + ') past end of tape (' + vml.length + ')');
			return false;
		}

		if(vml[a1_addr] && (vml[a1_addr].kind != 'blank') ) {
			vmlog(vml, 'set: destination ' + JSON.stringify(a1_addr) + ' already set (pc=' + vmregs.pc +')');
			return false;
		}

		vml[a1_addr] = a2;

		vmregs.pc = vmregs.pc + 1;
		return true;
		break;
	case "call":
		var a1_addr, a2, x, l, s, sym;

		if(i.arg1_seg == "fp") {
			s = vml[vmregs.fp].size;
			if(!s || (i.arg1 >= s)) {
				vmlog(vml, 'error: read past end of segment');
				return false;
			}
			a2 = vml[vmregs.fp + i.arg1 + 1];
		} else if(i.arg1_seg == "r1") {
			s = vml[vmregs.r1].size;
			if(!s || (i.arg1 >= s)) {
				vmlog(vml, 'error: read past end of segment');
				return false;
			}
			a2 = vml[vmregs.r1 + i.arg1 + 1];
		} else if(i.arg1_seg == "r2") {
			s = vml[vmregs.r2].size;
			if(!s || (i.arg1 >= s)) {
				vmlog(vml, 'error: read past end of segment');
				return false;
			}
			a2 = vml[vmregs.r2 + i.arg1 + 1];
		} else if(i.arg1_seg == "pc") {
			a2 = vml[vmregs.pc + i.arg1];
		} else if(i.arg1_seg == "abs") {
			if(i.arg1 >= vml.length) {
				vmlog(vml, 'source past end of tape');
				return defer(i.arg1, vml, vmregs);
			}
			a2 = vml[i.arg1];
			if(!a2 || (a2.kind=='blank') ) {
				vmlog(vml, 'source blank');
				return defer(i.arg1, vml, vmregs);
			}
		} else if(i.arg1_seg == "reg") {
			vmlog(vml, 'nah. you do not want to source a register');
			return false;
		} else {
			vmlog(vml, 'unknown segment for call operand');
			return false;
		}

		if(a2.kind != "addr") {
			vmlog(vml, 'call frame is not an addr');
			return false;
		}

		if(a2.val >= vml.length) {
			vmlog(vml, 'cannot call with a missing frame');
			return false;
		}

		// should check that the whole frame is actually present.

		//vmlog(vml, 'yikes: calling with frame: ' + a2.val);
		if(!(sym = syms[i.target])) {
			vmlog(vml, 'no such symbol ' + i.target);
			return false;
		}

		//vmlog(vml, "the ffi call frame: " + JSON.stringify(a2));
		sym.handler(vml, a2.val);
		vmregs.pc = vmregs.pc + 1;
		return true;
		break;
	case "fork":
		//vmlog(vml, 'yikes: forking: ' + JSON.stringify(vmregs));

		if(i.arg1_seg == "fp") {
			s = vml[vmregs.fp].size;
			if(!s || (i.arg1 >= s)) {
				vmlog(vml, 'error: fork fp');
				return false;
			}
			a1 = vml[vmregs.fp + i.arg1 + 1];
			if(!a1 || (a1.kind=='blank') ) {
				vmlog(vml, 'fork fp blank');
				return defer(i.arg1, vml, vmregs);
			}
			if(a1.kind != "addr") {
				vmlog(vml, 'can not fork to a non-addr frame: ' + JSON.stringify(a1));
				return false;
			}
			a1 = a1.val;
		} else if(i.arg1_seg == "r1") {
			s = vml[vmregs.r1].size;
			if(!s || (i.arg1 >= s)) {
				vmlog(vml, 'error: fork r past end of segment');
				return false;
			}
			a1 = vml[vmregs.r1 + i.arg1 + 1];
			if(!a1 || (a1.kind=='blank') ) {
				vmlog(vml, 'fork fp blank');
				return defer(i.arg1, vml, vmregs);
			}
			if(a1.kind != "addr") {
				vmlog(vml, 'can not fork to a non-addr frame: ' + JSON.stringify(a1));
				return false;
			}
			a1 = a1.val;
		} else if(i.arg1_seg == "r2") {
			s = vml[vmregs.r2].size;
			if(!s || (i.arg1 >= s)) {
				vmlog(vml, 'error: fork r2 past end of segment');
				return false;
			}
			a1 = vml[vmregs.r2 + i.arg1 + 1];
			if(!a1 || (a1.kind=='blank') ) {
				vmlog(vml, 'fork fp blank');
				return defer(i.arg1, vml, vmregs);
			}
			if(a1.kind != "addr") {
				vmlog(vml, 'can not fork to a non-addr frame: ' + JSON.stringify(a1));
				return false;
			}
			a1 = a1.val;
		} else if(i.arg1_seg == "pc") {
			a1 = vml[vmregs.pc + i.arg1];
			if(!a1 || (a1.kind=='blank') ) {
				vmlog(vml, 'fork fp blank');
				return defer(i.arg1, vml, vmregs);
			}
			if(a1.kind != "addr") {
				vmlog(vml, 'can not fork to a non-addr frame: ' + JSON.stringify(a1));
				return false;
			}
			a1 = a1.val;
		} else if(i.arg1_seg == "abs") {
			if(i.arg1 >= vml.length) {
				vmlog(vml, 'fork fp past end of tape');
				return defer(i.arg1, vml, vmregs);
			}
			a1 = vml[i.arg1];
			if(!a1 || (a1.kind=='blank') ) {
				vmlog(vml, 'fork fp blank');
				return defer(i.arg1, vml, vmregs);
			}
			if(a1.kind != "addr") {
				vmlog(vml, 'can not fork to a non-addr frame: ' + JSON.stringify(a1));
				return false;
			}
			a1 = a1.val;
		} else if(i.arg1_seg == "reg") {
			// a register is fine as long as it is backed by tape.
			if(i.arg1 == "fp") {
				a1 = vmregs.fp;
			} else {
				vmlog(vml, 'nah. you do not want to fork that register');
				return false;
			}
		} else {
			vmlog(vml, 'unknown segment for fork fp');
			return false;
		}

		if(a1 >= vml.length) {
			vmlog(vml, 'fork fp past end of tape');
			return defer(a1, vml, vmregs);
		}

		if(!vml[a1] || (vml[a1].kind=='blank') ) {
			vmlog(vml, 'fork frame blank');
			return defer(a1, vml, vmregs);
		}

		if(vml[a1].kind != "frame") {
			vmlog(vml, 'fork frame must be a frame');
			return false;
		}

		if(i.arg2_seg == "fp") {
			s = vml[vmregs.fp].size;
			if(!s || (i.arg2 >= s)) {
				vmlog(vml, 'error: fork target');
				return false;
			}
			a2 = vml[vmregs.fp + i.arg2 + 1];
			if(!a2 || (a2.kind=='blank') ) {
				vmlog(vml, 'fp-relative fork target blank 1');
				return defer(vmregs.fp + i.arg2 + 1, vml, vmregs);
			}
		} else if(i.arg2_seg == "r1") {
			s = vml[vmregs.r1].size;
			if(!s || (i.arg2 >= s)) {
				vmlog(vml, 'error: fork target past end of segment');
				return false;
			}
			a2 = vml[vmregs.r1 + i.arg2 + 1];
			if(!a2 || (a2.kind=='blank') ) {
				vmlog(vml, 'blank fork target r[' + i.arg2 + ']');
				return defer(vmregs.r1 + i.arg2 + 1, vml, vmregs);
			}
		} else if(i.arg2_seg == "r2") {
			s = vml[vmregs.r2].size;
			if(!s || (i.arg2 >= s)) {
				vmlog(vml, 'error: fork target past end of segment');
				return false;
			}
			a2 = vml[vmregs.r2 + i.arg2 + 1];
			if(!a2 || (a2.kind=='blank') ) {
				vmlog(vml, 'blank fork target r2[' + i.arg2 + ']');
				return defer(vmregs.r2 + i.arg2 + 1, vml, vmregs);
			}
		} else if(i.arg2_seg == "pc") {
			a2 = vml[vmregs.pc + i.arg2];
			if(!a2 || (a2.kind=='blank') ) {
				vmlog(vml, 'pc-relative fork target blank 3');
				return defer(vmregs.pc + i.arg2, vml, vmregs);
			}
		} else if(i.arg2_seg == "abs") {
			if(i.arg2 >= vml.length) {
				vmlog(vml, 'fork target past end of tape');
				return defer(i.arg2, vml, vmregs);
			}
			a2 = vml[i.arg2];
			if(!a2 || (a2.kind=='blank') ) {
				vmlog(vml, 'fork target blank 4');
				return defer(i.arg2, vml, vmregs);
			}
		} else if(i.arg2_seg == "reg") {
			vmlog(vml, 'nah. you do not want to fork a register');
			return false;
		} else {
			vmlog(vml, 'unknown segment for fork target');
			return false;
		}

		if(a2.kind != "addr") {
			vmlog(vml, 'error: fork: can not fork to a non-addr target: ' + JSON.stringify(a2) + ' at ' + JSON.stringify(i.arg2_seg)+":"+JSON.stringify(i.arg2));
			return false;
		}

		if(vml[a2.val].kind != "frame") {
			vmlog(vml, 'fork target must be a frame');
			return false;
		}

		//vmlog(vml, 'fork fp is: ' + JSON.stringify(a1) + ', pc is: ' + JSON.stringify(a2));

		if(	(vmregs.fp == a1) &&
			((vmregs.pc + 1) < vml.length) && 
			(vml[vmregs.pc + 1].kind  ==  "op") &&
			(vml[vmregs.pc + 1].val == "alice")) {

			// we are really continuing this thread
			vmregs.pc = a2.val;
			vmregs.fp = a1;
			vmregs.r1 = 0;
			vmregs.r2 = 0;
		} else {
			// this should unblock right away because it blocks on the target
			vml.push({
				kind: "deferred",
				pc: a2.val,
				fp: a1,
				r1: 0,
				r2: 0,
				blocked: a2.val,
				completed: 0,
				next: 0,
			});
			vmregs.pc = vmregs.pc + 1;
		}
		return true;
		break;
	default:
		vmlog(vml, 'unknown opcode: ' + i.val);
		return false;
		break;
	}

	return false;
};
