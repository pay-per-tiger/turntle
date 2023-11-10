// caddrs are { kind: "caddr", seg: "xxx", val: xxx }
// (concrete addresses)
// segments:
//   pc: relative to the program counter (within the frame)
//   abs: relative to the start of tape
//   labs: absolute reference to a label
//   lrel: pc-relative reference to a label (within the frame)
//   lextent: useful only in frames. computes frame size based on
//            label

// some rules:
// * no frame may be overlap any other frame
// * all text must be in a frame
// * pc-relative addresses may not span frames
// * new abs values cannot appear at runtime
// * fork takes a frame for pc
// * frame cells cannot move

// expr typeofs
// string
// otherwise check kind
// kinds: lambda
// kinds: number
// kinds: nil
// else typeof == object
// length 0 is nil
// check lambda
// check env
// then check syms

// the ARVM ABI

// fork frames. These are the frames passed to fork
// as fp.
// 0: return value. filled by the callee
var ffr_ret_idx = 0;
// 1: parameter. filled by the caller
var ffr_param_idx = 1;
// 2: pointer to a frame with the environment. supplied by the caller.
var ffr_env_idx = 2;
// 3: self-pointer to frame
var ffr_self_idx = 3;
// 4: local var 0
var ffr_lcl_base = 4;
// 4 + n: local var n

// lambda tuples. the compiler generates these or schedules
// code that emits them at run time.
// 0: text frame
var lt_txt_idx = 0;
// 1: fork frame size
var lt_fs_idx = 1;
// 2: env frame
var lt_env_idx = 2;
var lt_size = 3;

// by convention, the parameter is in fp[x]
// the environment is in r[x]
// the new frame for a call is in r2[x]

var do_trace = 0;
var artrace = function(msg) {
	if(do_trace) {
		arlog(msg);
	}
};

compile_lambda = function(exp, vms, txt) {

	var uses_parameter = 1;

	//arlog("  this is a lambda with parameter " + pp(exp.val[1]) + " and body " + pp(exp.val[2]));
	//arlog("  the incoming environment is: " + JSON.stringify(txt.env));

	var lval, nt, ll, lla, x, lend;

	nt = { vml: [], locals: 0, regs: 0, env: [], uses_self: 0 };

	var np = function(x) { nt.vml.push(x); };
	var vp = function(x) { vms.vml.push(x); };
	var tp = function(x) { txt.vml.push(x); };

	//arlog("  building the new environment");
	var envset = make_envset(exp.val[1], exp.val[2], txt.env, vms.syms);
	if(envset.kind == "error") {
		return envset;
	}
	var envsize = 0;
	var e;
	for(e in envset.val) envsize++;
	//arlog("  the new environment is: " + JSON.stringify(envset.val));
	var newenv = [];
	if(envset.val[exp.val[1].val]) {
		// lambda uses its parameter
		newenv = [ [ exp.val[1].val, {kind: "caddr", seg: "fp", val: 1} ], newenv ];
		envsize--;
	} else {
		// does not
		uses_parameter = 0;
	}
	var uses_frame_parameter = 0;
	for(e in envset.val) {
		if(symeq(exp.val[1], e)) {
			var s = search_env(txt.env, e);
			//arlog('  checking var ' + e + ': ' + JSON.stringify(s));
		}
	}
	var envc = false; // caddr for the environment. false if no env.
	if(envsize == 1) {
		//arlog("  THIS LAMBDA HAS AN ENVIRONMENT OF ONE: " + JSON.stringify(envset.val));
		// don't build a frame for one element
		for(e in envset.val) {
			if(symeq(exp.val[1], e)) {
				//arlog("  this is the parameter");
			} else {
				var ent = search_env(txt.env, e);
				if(!ent) {
					arlog("  unable to find " + e);	
					return false;
				}
				envc = ent;
				newenv = [ [ e, {kind: "caddr", seg: "fp", val: ffr_env_idx} ], newenv ];
				break;
			}
		}
	} else if(envsize) {

		var is_static = 0;
		var uses_only_frame = 1;
		//arlog("  checking to see if we use only the incoming frame");
		for(e in envset.val) {
			if(symeq(exp.val[1], e)) {
				// this is the parameter
			} else {
				var ent = search_env(txt.env, e);
				//arlog("  CHECKING: " + JSON.stringify(ent));
				if(ent.seg != "fp")
					uses_only_frame = 0;
			}
		}

		if(uses_only_frame) {

			// if our environment comes entirely from parent frame,
			// we can just use that frame as our environment without
			// building one.

			var ep;
			ep = nt.regs++;

			// map the environment in the new text
			np(set("ssa", ep, "fp", ffr_env_idx));

			envc = {kind: "caddr", seg: "fp", val: ffr_self_idx};
			txt.uses_self = 1;
			for(e in envset.val) {
				if(symeq(exp.val[1], e)) {
					//arlog("this is the parameter");
				} else {
					//arlog("setting env entry for " + e);
					var ent = search_env(txt.env, e);
					//arlog("adding " + e + " to the environment from " + JSON.stringify(ent));
					// since we're passing through our frame as the environment,
					// the indicies remain the same
					newenv = [ [ e, {kind: "caddr", seg: ep, val: ent.val} ], newenv ];
				}
			}
		} else {

			// a mixed environment
			var ep;
			var nel, ner;
			nel = txt.locals++;
			ner = txt.regs++;
			ep = nt.regs++;

			// map the environment in the new text
			//np(ar_debug("mapping the environment"));
			np(set("ssa", ep, "fp", ffr_env_idx));
			//tp(ar_debug("loading the new environment"));
			tp(feed("fp", ffr_lcl_base + nel, "labs", mksz(vms, envsize)));
			envc = {kind: "caddr", seg: "fp", val: ffr_lcl_base + nel};
			tp(set("ssa", ner, "fp", ffr_lcl_base + nel));
			var x;
			x = 0;
			var e;
			for(e in envset.val) {
				if(symeq(exp.val[1], e)) {
					//arlog("this is the parameter");
				} else {
					//arlog("setting env entry for " + e);
					var ent = search_env(txt.env, e);
					//arlog("adding " + e + " to the environment from " + JSON.stringify(ent));
					tp(set(ner, x, ent.seg, ent.val));
					newenv = [ [ e, {kind: "caddr", seg: ep, val: x} ], newenv ];
					x++;
				}
			}
		}
	} else {
		// no environment
	}
	nt.env = newenv;

	if((exp.val[2].kind == "list") && exp.val[2].val.length) {
		// a tail call.
	}

	// compiling the body
	lval = compile_exp(exp.val[2], vms, nt);
	if(!lval) {
		arlog("failed to compile the body");
		return false;
	} else if(lval.kind == "error") {
		return lval;
	}

	np(set("fp", ffr_ret_idx, lval.seg, lval.val));
	np(alice());

	// push the lambda body into the tape
	lla = vms.labels++;
	ll = vms.labels++;
	lend = vms.labels++;
	vp(label(lla));
	vp(lref(ll));
	vp(label(ll));
	vp(frame({seg: "lextent", val: lend}));
	for(x = 0 ; x < nt.vml.length ; x++) {
		vp(nt.vml[x]);
	}
	vp(label(lend));

	if(envc) {
		// make the tuple
		var tuple = txt.locals++;
		var nfr = txt.regs++;
		//tp(ar_debug("building the tuple"));
		tp(feed("fp", ffr_lcl_base + tuple, "labs", mksz(vms, lt_size)));
		tp(set("ssa", nfr, "fp", ffr_lcl_base + tuple));
		tp(set(nfr, lt_txt_idx, "labs", lla));
		tp(set(nfr, lt_fs_idx, "labs", mksz(vms,ffr_lcl_base + nt.locals)));
		tp(set(nfr, lt_env_idx, envc.seg, envc.val));

		// this lambda uses a dynamic tuple
		return {
			kind: "caddr",
			seg: "fp",
			val: ffr_lcl_base + tuple,
			type: "lambda_tuple",
			uses_parameter: uses_parameter,
			uses_self: nt.uses_self,
			ignores_env: 0,
			parameter: pp(exp.val[1]),
			body: pp(exp.val[2])
		};
	} else {
		var tl, tla, tend, fsize;
		tl = vms.labels++;
		tla = vms.labels++;
		tend = vms.labels++;
		fsize = sz(ffr_lcl_base + nt.locals);
		vp(label(tla));
		vp(lref(tl));
		vp(label(tl));
		vp(frame({seg: "lextent", val: tend}));
		vp(lref(ll));
		vp(fsize);
		vp(lref(vms.ienv));
		vp(label(tend));

		// this lambda uses a static tuple
		return {
			kind: "caddr",
			seg: "labs",
			val: tla,
			type: "lambda_tuple",
			uses_parameter: uses_parameter,
			uses_self: nt.uses_self,
			ignores_env: 1,
			parameter: pp(exp.val[1]),
			body: pp(exp.val[2])
		};
	}
};

compile_apply = function(exp, vms, txt) {

	//arlog('compile apply: ' + pp(exp.val[0]) + ' -- ' + pp(exp.val[1]));

	if((exp.val[0].kind == "symbol") && (exp.val[1].kind == "symbol") && (exp.val[0].val == exp.val[1].val)) {
		arlog("HOLY MOLY! FOUND A RECURSIVE OPPORTUNITY.");
	}

	if((exp.val[0].kind == "list") && exp.val[0].val.length && (exp.val[0].val[0].kind == "symbol") && symeq(exp.val[0].val[0], "lambda")) {
		var arg, r;

		// special case where we are about to call lambda created
		// right here.
		//arlog("DISPOSABLE SPECIAL CASE TARGET LAMBDA=" + pp(exp.val[0]) + " arg=" + pp(exp.val[1]));

		if((exp.val[1].kind == "list") && exp.val[1].val.length && (exp.val[1].val[0].kind == "symbol") && symeq(exp.val[1].val[0], "lambda")) {
			// an inline lambda being passed a lambda
			var envset = make_envset(exp.val[0].val[1], exp.val[0].val[2], txt.env, vms.syms);
			if(envset.kind == "error") {
				return envset;
			}
			if(!envset.val[exp.val[0].val[1].val]) {
				// we don't use the passed lambda. skip it.
				return compile_exp(exp.val[0].val[2], vms, txt);
			}
		}

		arg = compile_exp(exp.val[1], vms, txt);
		//arlog('apply: argument : ' + JSON.stringify(arg));
		if(!arg) {
			arlog('failed to compile the argument to the application');
			return false;
		} else if(arg.kind == "error") {
			return arg;
		}
		// temporarily doctor the environment and compile the body
		txt.env = [ [ exp.val[0].val[1].val, arg ], txt.env ];
		r = compile_exp(exp.val[0].val[2], vms, txt);
		txt.env = txt.env[1];
		if(!r) {
			arlog('failed to compile the lambda body');
			return false;
		} else if(r.kind == "error") {
			return r;
		}

		return r;

	} else {
		var targ, arg, fr, tu;
		var tp = function(x) { txt.vml.push(x); };
		//arlog('how could I know that ' + pp(exp.val[0]) + ' will be a tuple?');
		targ = compile_exp(exp.val[0], vms, txt, 1);
		if(!targ) {
			arlog('failed to compile the target of the application');
			return false;
		} else if(targ.kind == "error") {
			return targ;
		}
		if(targ.type == "lambda_tuple") {
			//arlog('apply target is already known to be a tuple. DOH! I COULD HAVE SKIPPED THE TUPLE!: ' + JSON.stringify(targ));
		}
		arg = compile_exp(exp.val[1], vms, txt);
		if(!arg) {
			arlog('failed to compile the argument to the application');
			return false;
		} else if(arg.kind == "error") {
			return arg;
		}

		//arlog('apply: target : ' + JSON.stringify(targ));
		//arlog('apply: argument : ' + JSON.stringify(arg));

		fr = txt.locals++;
		tu = txt.regs++;
		frreg = txt.regs++;

		// load tuple in reg
		tp(set("ssa", tu, targ.seg, targ.val));

		// feed the new ffr frame into fr
		//tp(ar_debug("feeding ffr frame"));
		tp(feed("fp", ffr_lcl_base + fr, tu, lt_fs_idx));

		// load the new frame in reg
		tp(set("ssa", frreg, "fp", ffr_lcl_base + fr));

		// load the parameter.
		if((targ.type != "lambda_tuple") || (targ.uses_parameter))
			tp(set(frreg, ffr_param_idx, arg.seg, arg.val));
		//else
			//tp(ar_debug("not loading the parameter"));

		// load the environment. we can sometimes skip this
		if((targ.type != "lambda_tuple") || (!targ.ignores_env))
			tp(set(frreg, ffr_env_idx, tu, lt_env_idx));

		// load the self. we can sometimes skip this
		if((targ.type != "lambda_tuple") || (targ.uses_self))
			tp(set(frreg, ffr_self_idx, "fp", ffr_lcl_base + fr));

		// and fork
		tp(fork("fp", ffr_lcl_base + fr, tu, lt_txt_idx));

		return {kind: "caddr", seg: frreg, val: ffr_ret_idx};
	}
};

compile_call = function(exp, vms, txt) {
	var argc;
	var x, args, r;
	var p = function(x) { txt.vml.push(x); };

	artrace('compiling a call: ' + JSON.stringify(exp));

	argc = vms.syms[exp.val[0].val].args;
	args = [];

	if((exp.val.length) < (argc + 1)) {
		return {
			kind: "error",
			msg: exp.val[0].val + ' takes ' + argc + ' arguments. ' + (exp.val.length - 1) + ' present',
			exp: exp
		};
	}

	for(x = 0 ; x < argc ; x++) {
		// compile argument x
		//arlog('compiling argument ' + x);
		r = compile_exp(exp.val[x + 1], vms, txt);
		if(!r) {
			arlog("failed to compile arg " + x);
			return false;
		} else if(r.kind == "error") {
			return r;
		}
		args.push(r);
	}

	// set up the call frame and call
	var fr = txt.locals++;
	var frreg = txt.regs++;
	//p(ar_debug("feeding call frame"));
	p(feed("fp", ffr_lcl_base + fr, "labs", mksz(vms, argc + 1)));
	p(set("ssa", frreg, "fp", ffr_lcl_base + fr));
	// set up the arguments
	for(x = 0 ; x < argc ; x++) {
		p(set(frreg, x + 1, args[x].seg, args[x].val));
	}
	p(call(exp.val[0].val, "fp", ffr_lcl_base + fr));

	return {kind: "caddr", "seg": frreg, "val": 0};
};

// accept a single form, a vmstruct.
// return a caddr.
compile_exp = function(exp, vms, txt) {
	var x;

	//arlog('compiling ' + pp(exp));
	if(exp.kind == "number") {
		return {
			kind: "caddr",
			seg: "labs",
			val: mklit(vms, exp.val),
		};
	} else if(exp.kind == "string") {
		return {
			kind: "caddr",
			seg: "labs",
			val: mklit(vms, exp.val),
		};
	} else if(exp.kind == "caddr") {
		return exp;
	} else if(exp.kind == "symbol") {
		var e;
		e = search_env(txt.env, exp.val);
		if(e) {
			return e;
		} else if(vms.syms[exp.val]) {
			arlog("FFI symbols are not first class");
			return false;
		} else {
			arlog("unable to find " + exp.val + " in the environment " + JSON.stringify(txt.env));
			return false;
		}
	} else if(exp.kind == "list") {
		//artrace('compiling a list');

		if(exp.val.length == 0) {
			// empty lists are nil
			return {
				kind: "caddr",
				seg: "labs",
				val: mknil(vms)
			};
		} else if((exp.val[0].kind == "symbol") && symeq(exp.val[0], "lambda")) {
			//arlog('compile_exp: compiling a lambda');
			return compile_lambda(exp, vms, txt);
		} else if(search_env(txt.env, exp.val[0].val)) {
			var e = search_env(txt.env, exp.val[0].val);
			return compile_apply({kind: "list", val: [e, exp.val[1]]}, vms, txt);
		} else if(vms.syms[exp.val[0].val]) {
			//arlog('compile_exp: compiling a call');
			return compile_call(exp, vms, txt);
		} else {
			return compile_apply(exp, vms, txt);
		}
	} else {
		arlog("i don't know how to compile that yet: " + JSON.stringify(exp));
		return false;
	}
}


// compile accepts src: [ <form1> <form2> ... <formn> ]
// forms are compiled into a single tape and a structure
// is returned that contains the new tape, a set of inital
// register values, and a final address. compile_into 
// accepts an existing tape.

compile_into = function(src, vml, syms, tape) {

	var x;
	var r;
	var ipc, ifp, id, tlen, dlen;
	var final;

	var vmstruct = {
		labels: 1,
		vml: vml,
		lit_hash: {},
		size_hash: {},
		syms: syms
	};
	var text_vml = [];
	r = false;
	var ienv;

	vml.push(alice()); // zero is a tricky address for vml

	ipc = vmstruct.labels++; // initial program counter
	ifp = vmstruct.labels++; // initial frame pointer
	id = vmstruct.labels++;  // initial deferred object
	tlen = vmstruct.labels++; // text length
	dlen = vmstruct.labels++; 
	final = vmstruct.labels++; // our return address
	ienv = vmstruct.labels++;

	vml.push(label(id)),
	vml.push({kind: "deferred",
		pc: 1,
		fp: 1,
		r: 0,
		r2: 0,
		blocked: 1,
		completed: 1,
		next: 0}); // a dummy deferred

	vmstruct.ienv = ienv;
	vml.push(label(ienv));
	vml.push(frame(0));

	text_vml.push(label(ipc));
	text_vml.push(frame({seg: "lextent", val: tlen})); // an initial text frame
	var txt = {
		vml: text_vml,
		locals: 0,
		regs: 0,
		env: [],
	};

	for(x = 0; x < src.length ; x++) {
		
		//arlog("compile: considering: " + pp(src[x]));
		r = compile_exp(src[x], vmstruct, txt);
		if(!r) {
			arlog("failed to compile " + pp(src[x]));
			return false;
		} else if(r.kind == "error") {
			return r;
		}
	}

	// write the return value
	text_vml.push(set("fp", ffr_ret_idx, r.seg, r.val));

	// and halt.
	text_vml.push(alice());

	// the extent for our initial label
	text_vml.push(label(tlen));

	var x;
	for(x = 0 ; x < text_vml.length ; x++) {
		vml.push(text_vml[x]);
	}

	// and now an initial frame with enough locals
	vml.push(label(ifp));
	vml.push(frame({seg: "lextent", val: dlen})); // an initial data frame
	vml.push(label(final));
	vml.push(blank()); // return value;
	vml.push(blank()); // temporary frame;
	vml.push(lref(ienv)); // environment value;
	vml.push(lref(ifp)); // self value;
	for(x = 0 ; x < txt.locals ; x++)
		vml.push(blank());
	vml.push(label(dlen));

	//arlog('about to name registers: ');
	//show(vml);

	if(!regname(vml)) {
		arlog('unable to name registers');
		return false;
	}

	//arlog('about to assemble: ');
	//show(vml);

	var start = tape.length;

	// here in the outer compiler, global and vml are one and the same
	var label_dict = assemble(tape, start, vml);
	if(!label_dict || (label_dict.kind == "error")) {
		return label_dict;
	}

	//arlog('newtape: ');
	//show(newtape);
	//arlog('final address: ' + label_dict[final]);

	return {
		kind: "program",
		initial_regs: mkregs(
			label_dict[ipc],
			label_dict[ifp],
			0,
			0,
			label_dict[id]),
		final_address: label_dict[final],
		tape: tape,
		labels: label_dict,
		tape_start: start,
		tape_end: tape.length
	}
};

compile = function(src, vml, syms) {
	var newtape = [];

	return compile_into(src, vml, syms, newtape);
};
