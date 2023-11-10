// Run an ARVM.
// csteps accepts a vml tape, a registers structure, and a dictionary of FFI symbols.
// csteps demonstrates the obvious -- arvm execution can be stopped in one stack
// and restarted in another stack. csteps is likely to return before execution completes.

var find_blockage = function(vml, regs) {
	var d;
	d = regs.deferred;
	while(d) {
		if(!vml[d].completed) {
			if(vml[d].pc == regs.pc) {
				if(vml[d].fp == regs.fp) {
					//arlog('found the blockage: ' + JSON.stringify(vml[d]));
					return d;
				}
			}
		}
		d = vml[d].next;
	}
};

//lastcells = false;
cscan = function(vml, regs) {
	var d;
	var cells = {};
	var cellcount = 0;

	//arlog('tape is ' + vml.length + ' long');
	d = regs.deferred;
	while(d) {
		if(vml[d].kind != 'deferred') {
			arlog('error: deferred points to non-deferred');
			return;
		} else if(vml[d].completed) {
		} else if(vml[vml[d].blocked].kind != "blank") {
			arlog('silently completed');
		} else {
			if(vml[vml[d].blocked - 1].kind == "frame") {
				if(cells[vml[d].blocked]) {
				} else {
					cells[vml[d].blocked] = 1;
					cellcount++;
				}
			}
		}
		d = vml[d].next;
	}
	//arlog('cellcount: ' + cellcount);
	//lastcells = cells;

	return cellcount;
};

csteps = function(vml, regs, syms, until, next) {
	var pivot_thresh = 10000;
	var again = function() {
		// we must context switch before just restarting stepping after
		// failure.
		if(context_switch(vml, regs)) {
			csteps(vml, regs, syms, until, next);
		} else {
			setTimeout(again, 10);
		}
	};

	if(until && (until >= vml.length)) {
		vmlog(vml, "attempt to watch a point past end of tape");
		return false;
	}

	if(until && (vml[until].kind != "blank")) {
		if(next) {
			next();
		}
		return true;
	}

	for(x = 0 ; x < pivot_thresh ; x++) {
		//arlog('step: ' + JSON.stringify(regs));
		//arlog('insn: ' + JSON.stringify(vml[regs.pc]));
		if(!step(vml, regs, syms)) {
			//arlog('step fails');
			var outstanding = cscan(vml, regs);
			if(!outstanding) {
				arlog("unable to step with no actions uncompleted");
				if(next) {
					next(false);
				}
			} else {
				//if(next) {
				//	next(false);
				//}
				//var d = find_blockage(vml, regs);	
				//arlog('blockage: ' + JSON.stringify(vml[d]));	
				setTimeout(again, 10);
				return;
			}
			return;
		} else {
			if(until && (vml[until].kind != "blank")) {
				//arlog('lastcells: ' + JSON.stringify(lastcells));
				//cscan(vml, regs);
				//arlog('lastcells now: ' + JSON.stringify(lastcells));
				if(next) {
					next();
				}
				return;
			}
		}
	}

	setTimeout(function() {
			csteps(vml, regs, syms, until, next);
	}, 10);
};
