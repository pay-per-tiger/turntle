'use strict';
var world;
var debug;

var arlog;

var dumpline;
var dump;

var boot = function() {
	var output_div = false;
	var echo_div = false;

	debug = function(m) {
		if(echo_div) {
			echo_div.appendChild(document.createTextNode(m));
			echo_div.appendChild(document.createElement('br'));
		} else {
			document.body.appendChild(document.createTextNode(m));
			document.body.appendChild(document.createElement('br'));
		}
	};

	var qs = (function(a) {
		if (a == "") return {};
		var b = {};
		for (var i = 0; i < a.length; ++i)
		{
			var p=a[i].split('=');
			if (p.length != 2) continue;
			b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
		}
		return b;
	})(window.location.search.substr(1).split('&'));

	output_div = document.getElementById('output');

	var world_div = bootturtle(output_div);

	output_div.appendChild(world_div);

	world = mkworld();

	var td;
	var turtle = mkturtle();
	td = world.add_turtle(turtle);
	world.set_turtle(td);

	echo_div = document.getElementById('echo');
	var outer_echo_div = document.getElementById('echo');

	//output_div.addEventListener('scroll', function(e) {
	//	alert('output_div scroll');
	//}, false);
	echo_div.addEventListener('scroll', function(e) {
		alert('echo div scroll');
	}, false);
	outer_echo_div.addEventListener('scroll', function(e) {
		alert('outer echo div scroll');
	}, false);

	var ce = document.getElementById('ce');
	// for ios
	ce.autocapitalize="none";
	ce.autocorrect="off";
	ce.autocomplete="off";
	ce.spellcheck=false;
	ce.focus();

	dump = function(e) {
		echo_div.appendChild(e);
	};

	dumpline = function(l) {
		echo_div.appendChild(document.createTextNode(l));
		echo_div.appendChild(document.createElement('br'));
		//echo_div.scrollTop = element.scrollHeight;
		echo_div.scrollTop = 100000;
		outer_echo_div.scrollTop = 100000;
		output_div.scrollTop = 100000;
	};

	arlog = dumpline;

	world.dumpline = dumpline;

	if(window.applicationCache) {
		window.applicationCache.addEventListener('checking', function(e) {
			//dumpline('checking');
		}, false);
		window.applicationCache.addEventListener('error', function(e) {
			//dumpline('error');
		}, false);
		window.applicationCache.addEventListener('downloading', function(e) {
			//dumpline('downloading');
		}, false);
		window.applicationCache.addEventListener('cached', function(e) {
			//dumpline('cached');
		}, false);
		window.applicationCache.addEventListener('progress', function(e) {
			//dumpline('progress');
		}, false);
		window.applicationCache.addEventListener('updateready', function(e) {
			//dumpline('updateready');
			window.applicationCache.swapCache();
		}, false);
		window.applicationCache.addEventListener('noupdate', function(e) {
			//dumpline('noupdate');
		}, false);
	} else {
		//dumpline('no application cache');
	}

	var dump_error = function(element, errnode) {
		var frame;
		var lastframe;
		var ast;
		var node;

		dumpline('error: ' + errnode.val.val);

		frame = errnode.stack;
		while(frame && frame.length) {
			// the stack is [ frame, stack ... ]
			// a frame is [ AST, AST index ]
			lastframe = frame;
			frame = frame[1];
		}

		if(!lastframe)
			return;

		lastframe = lastframe[0];

		if(!lastframe[0])
			return;

		ast = lastframe[0];

		if(!ast)
			return;

		node = ast[lastframe[1]];
		if(node.src && node.colstart!=false && node.colend!=false) {
			var pre,infix,post,span;

			pre = node.src.slice(0, node.colstart);
			infix = node.src.slice(node.colstart, node.colend);
			post = node.src.slice(node.colend, node.src.length);

			span = document.createElement('span');
			span.appendChild(document.createTextNode(pre));
			span.style.color='blue';
			element.appendChild(span);

			span = document.createElement('span');
			span.appendChild(document.createTextNode(infix));
			span.style.color='red';
			element.appendChild(span);

			span = document.createElement('span');
			span.appendChild(document.createTextNode(post));
			//span.style.color='green';
			element.appendChild(span);

			element.appendChild(document.createElement('br'));
		}
	};

	var lastbundle = false;
	var webshow = function(tape) {
		var x;
		for(x = 0 ; x < tape.length ; x++) {
			dumpline('pos ' + x + ': ' + JSON.stringify(tape[x]));
		}
	}

	var toplevel = mktoplevel();

	var dump_compile_error = function(val, err) {
		if(err.exp && (typeof(err.exp.start_idx) == "number") && (typeof(err.exp.end_idx) == "number")) {
			var s;
			dump(document.createTextNode(val.substring(0, err.exp.start_idx)));
			s = document.createElement('span');
			s.style.color = 'red';
			s.appendChild(document.createTextNode(val.substring(err.exp.start_idx, err.exp.end_idx)));
			dump(s);
			dump(document.createTextNode(val.substring(err.exp.end_idx)));
			dump(document.createElement('br'));
			dumpline("error: " + err.msg + ' in: ' + pp(err.exp));
		} else if(typeof(err.start_idx) == "number") {
			var s;
			dump(document.createTextNode(val.substring(0, err.start_idx)));
			s = document.createElement('span');
			s.style.color = 'red';
			if(err.idx == val.length) {
				s.appendChild(document.createTextNode(val.substring(err.start_idx, err.idx + 1)));
				dump(s);
			} else {
				s.appendChild(document.createTextNode(val.substring(err.start_idx, err.idx + 1)));
				dump(s);
				dump(document.createTextNode(val.substring(err.idx + 1)));
			}
			dump(document.createElement('br'));
			dumpline("syntax error: " + err.msg + " at position " + err.start_idx);
		}
	}

	var precompile = function(val, exp, prog, syms) {
		var e;
		var c;
		var v;

		for(e in exp) {
			exp[e] = process_toplevel(toplevel, exp[e], syms);
			v = macro_expand(exp[e], syms);
			if(!v) {
				dumpline("unable to macro expand");
				return;
			} else if(v.kind == "error") {
				dump_compile_error(val, v);
				return false;
			}
			exp[e] = v;
		}
		c = compile(exp, prog, syms);
		if(!c) {
			dumpline('failed to compile');
			return false;
		} else if(c.kind == "error") {
			dump_compile_error(val, c);
			return false;
		}

		return c;
	};

	var lib = stdlib;
	var newlib = [
		// constants
		"(define pi 3.14159265358979)",

		// turtle motion
		"(define turtle 1)",
		"(define fd (lambda (d) (_fd turtle d)))",
		"(define rt (lambda (d) (_rt turtle d)))",
		"(define lt (lambda (d) (_lt turtle d)))",
		"(define pu (lambda () (_pu turtle)))",
		"(define pd (lambda () (_pd turtle)))",
		"(define gotoxy (lambda (x y) (_gotoxy turtle x y)))",

		// math
		"(define rad2deg (lambda r\
			(mul (div r (mul pi 2)) 360) (mul (div (mul r 10000) (mul 31416 2)) 360)))",

		"(define printmetrics (lambda (m)\
			((lambda (p)\
				(sync\
					(pu)\
					((lambda (helper)\
						(helper helper m 1)\
					) (lambda (helper cursor d)\
						((lambda (advance)\
						(if (isnil cursor)\
							(sync\
								(pu)\
								(gotoxy (car p) (car (cdr p)))\
							)\
							(if (add (car (car cursor)) 1)\
								(advance (cdr cursor))\
								(if (add (cdr (car cursor)) 1)\
									(advance (cdr cursor))\
									(sync\
										(pu)\
										(helper helper (cdr cursor) 1)\
									)\
								)\
							)\
						)\
						) (lambda (n)\
							(sync\
								(gotoxy\
									(add (car (car cursor)) (car p))\
									(add (cdr (car cursor)) (car (cdr p)))\
								)\
								(if d (pd) ())\
								(helper helper (cdr cursor) 0)\
							)\
						))\
					))\
				)\
			) (pos))\
		))",

		"(define widthmetrics (lambda metrics (begin\
			((lambda (helper)\
				(helper helper metrics 0)\
			)\
			(lambda (helper cursor w)\
				(if (isnil cursor)\
					w\
					(helper\
						helper\
						(cdr cursor)\
						(if (gt (car (car cursor)) w)\
							(car (car cursor))\
							w\
						)\
					)\
				)\
			))\
		)))",

		"(define print (lambda str (begin\
			((lambda l \
			((lambda (helper) \
				(helper helper l)\
			)\
			(lambda (helper cursor)\
				(if (iszero cursor) \
					() \
					((lambda m (sync \
						(printmetrics m) \
						(fd (add 5 (widthmetrics m))) \
						(helper helper (sub cursor 1)) \
					)) (metrics (strref str (sub l cursor))))\
				)\
			))) (strlen str))\
		)))",

		// interesting primitives
		"(define star (lambda l (do 5 (begin (fd l) (rt 144)))))",
		"(define circle (lambda r\
			(sync\
				(pu)\
				(fd r)\
				(lt 90)\
				(pd)\
				(do (add 360 0) (sync\
					(fd (div (mul 2 (mul pi r)) 360))\
					(lt 1)\
				))\
				(pu)\
				(lt 90)\
				(fd r)\
				(rt 180)\
			)\
		))",
		"(define cosd (lambda (a) (cos (mul (mul pi 2) (div a 360)))))",
		"(define sind (lambda (a) (sin (mul (mul pi 2) (div a 360)))))",
		"(define tand (lambda (a) (tan (mul (mul pi 2) (div a 360)))))",
		"(define acosd (lambda (v) (mul (div (acos v) (mul pi 2)) 360)))",
		"(define asind (lambda (v) (mul (div (asin v) (mul pi 2)) 360)))",
		"(define atand (lambda (v) (mul (div (atan v) (mul pi 2)) 360)))",

		"(define ngon (lambda (n s)\
		((lambda a (do n (begin (fd s) (rt a)))) (div 360 n))))",
	];
	var l;
	for(l in newlib) {
		lib.push(newlib[l]);
	}
	for(l in lib) {
		var e;
		e = read_sexp(lib[l], 0);
		if(!e) {
			dumpline('unable to parse library form ' + lib[l]);
			continue;
		}
		if(!e.length) {
			continue;
		}
		//dumpline('compiling ' + pp(e[0]));
		var new_syms = {};
		var sym;
		for(sym in library_syms) {
			new_syms[sym] = library_syms[sym];
		}
		for(sym in logo_syms) {
			new_syms[sym] = logo_syms[sym];
		}

		process_toplevel(toplevel, e[0], new_syms);
	}

	var process = function(val, success) {
		var a;
		var newprog = [];
                var bundle;

		a = read_sexp(val, 0);
		if(!a) {
			alert('failed to parse');
			return;
		}

		if(a.kind == "error") {
			dump_compile_error(val, a);
			return;
		}

		var new_syms = {};
		var sym;
		for(sym in library_syms) {
			new_syms[sym] = library_syms[sym];
		}
		for(sym in logo_syms) {
			new_syms[sym] = logo_syms[sym];
		}

		bundle = precompile(val, a, newprog, new_syms);

		if(!bundle) {
			return;
		}
		lastbundle = bundle;
		var runregs = dupregs(bundle.initial_regs);
		var fin = function(r) {
			var x;
			for(x = 0 ; x < bundle.tape.length ; x++) {
				if(bundle.tape[x].kind == "log") {
					dumpline(JSON.stringify(bundle.tape[x]));
				}
			}
			success(bundle.tape[bundle.final_address]);
		};
		// csteps will continue even if FFIs are late to finish
		csteps(bundle.tape, runregs, new_syms, bundle.final_address, function() {
			if(bundle.tape[bundle.final_address].kind == "blank") {
				dumpline('NO RESULTS');
			} else {
				fin(bundle.tape[bundle.final_address]);
			}
		});
		if((runregs.pc == bundle.initial_regs.pc)) {
			dumpline('your program concluded without running. some side-effects may be missing');
		}
	};

	ce.addEventListener('change', function(e) {
		var r;
		var a;
		var d;

		d = document.createElement('div');

		echo_div.appendChild(d);
		echo_div.scrollTop = 100000;
		outer_echo_div.scrollTop = 100000;
		output_div.scrollTop = 100000;

		if(ce.value == "show") {
			if(lastbundle) {
				dumpline('initial regs: ' + JSON.stringify(lastbundle.initial_regs));
				webshow(lastbundle.tape);
			} else {
				dumpline('no program to show');
			}
			ce.value = "";
			return;
		} else if(ce.value == "length") {
			if(lastbundle) {
				dumpline('tape length: ' + lastbundle.tape.length);
			} else {
				dumpline('no program to show');
			}
			ce.value = "";
			return;
		}

		var after = function(r) {
			dumpline(pp(r));
			ce.value='';
		};

		world.commands.push(ce.value);
		d.appendChild(document.createTextNode('> ' + ce.value));
		d.appendChild(document.createElement('br'));

		process(ce.value, after);

	}, false);

	document.body.addEventListener('drop', function(e) {
		e.preventDefault();
		dumpline('drop initiated...');
		if(e.dataTransfer && e.dataTransfer.files) {
			//dumpline('loading: ' + e.dataTransfer.files[0].name);
			var r = new FileReader();
			if(r.readAsText) {
				//alert('reading as text');
				r.addEventListener('load', function(en) {
					//alert('read');
					//dumpline(en.target.result);
					var rs;
					var a;
					a = logo.parse(en.target.result);
					//alert('parsed: ' + a);
					//dumpline(JSON.stringify(a));
					//logo.eval(a, 0, logo.mklocals(), function(rs) {
						////alert('evaluated to ' + rs);
						//if(rs) {
							//dumpline(': ' + logo.ppstx(rs));
						//}
					//});
				}, false);
				r.addEventListener('error', function(en) {
					debug('drop error:' + JSON.stringify(en));
				}, false);
				r.readAsText(e.dataTransfer.files[0]);
			}
		}
	}, false);

	var saved_commands;
	if(!window || window.localStorage) {
		saved_commands = window.localStorage.getItem('user_commands');
		if(saved_commands) {
			saved_commands = JSON.parse(saved_commands);
		}
		for(command in saved_commands) {
			logo.variables["var_" + saved_commands[command][0]] = {
				kind: "proc",
				stx: saved_commands[command][1],
				args: saved_commands[command][2],
				user: true,
				handler: logo.mkhandler(saved_commands[command][1], saved_commands[command][2])
			};
		}
	}

	logo.error = function(str) {
		dumpline(str);
	};

	(function() {
		var l;
		var focus=true;
		window.addEventListener('focus', function(e) {
			focus=true;
		}, true);
		window.addEventListener('blur', function(e) {
			focus=false;
		}, true);

		//logo.eval(logo.parse("set pitchbend 0"), 0, logo.mklocals(), function(r) {
		//	if(r.kind == "error") logo.error("error setting pitchbend");
		//});
		var mkmidihandler = function() {
			var note_dict = {};

			var cancel_note = function(v) {
				var n = note_dict[v];

				if(n) {
					note_dict[v] = false;
					n.cancel(function() {
						123;
					});
				}
			};

			var midi_handler = function(t, a) {
				//if(!focus)
				//	return;

				if(a[0] == 0x09 << 4) {
					if(a[2] == 0) {
						dumpline('cancelling MIDI');
						//cancel_note(a[1]);
					} else {
						// semitone = a[1] % 12
						// octave = Math.floor(a[1] / 12)
						// play it and stuff a canceler in note_dict[a[1]]
						dumpline('playing MIDI');
					}
				} else if(a[0] == 0x08 << 4) {
					dumpline('cancelling MIDI ' + a[1]);
				} else if(a[0] == 0x0b << 4) {
					if(a[1] < 120) {
						dumpline('control change: controller ' + a[1] + ' -- value ' + a[2]);
					} else {
						dumpline('channel mode message');
					}
				} else if(a[0] == 0x0e << 4) {
					dumpline('midi pitch bend ' + JSON.stringify(a));
				} else {
					dumpline('midi unknown ' + JSON.stringify(a));
				}
			};
			return midi_handler;
		};

		if(navigator.requestMIDIAccess) {
			var p;
			p = navigator.requestMIDIAccess();
			if(!p) {
				dumpline('no native MIDI access');
				return;
			}
			var setup_ports;
			setup_ports=function(ports) {
				ports.forEach(function(key, port) {
					var mh;
					dumpline('native midi device: ' + JSON.stringify(key) + ',' + JSON.stringify(port));
					mh = mkmidihandler();
					key.onmidimessage = function(event) {
						mh(false, event.data);
					};
				});
			}
			p.then(function(results) {
				results.onstatechange = function() {
					dumpline('midi state change');
					if(results.inputs.size) {
						dumpline('there are now' + results.inputs.size + ' midi ports');
						setup_ports(results.inputs);
					}
				};
				if(results.inputs.size) {
					dumpline('there are ' + results.inputs.size + ' midi ports');
					setup_ports(results.inputs);
				}
			});
		} else {
			return;
		}
	})();

	if(qs['eval']) {
		var r;
		var p;
		var w;

		p = logo.parse(qs['eval']);

		dumpline('> ' + qs['eval']);
		if(!p) {
			dumpline('unable to parse: ' + qs['eval']);
		}
		/*
		logo.eval(p, 0, logo.mklocals(), function(r) {
			var spin=function(r) {
				if(!r) {
					dumpline('repl evaluation fails');
				} else if(r.kind == "list") {
					dumpline(': ' + logo.ppstx(r.val[0]));
				} else if(r.kind == "promise") {
					//dumpline('eval got a promise back');
					if(!w) {
						w=document.createElement('div');
						echo_div.appendChild(w);
						//echo_div.scrollTop = echo_div.scrollHeight;
						echo_div.scrollTop = 100000;
						outer_echo_div.scrollTop = 100000;
						output_div.scrollTop = 100000;
						w.appendChild(document.createTextNode('waiting...'));
					} else {
						w.appendChild(document.createTextNode('.'));
					}
					r.force(function(rnew) {
						//dumpline('intermediate value: ' + logo.ppstx(rnew));
						return spin(rnew);
					});
				} else if(r.kind == 'error') {
					dumpline('top error: ' + r.val.val);
					var frame;
					frame = r.stack;
					while(frame.length) {
						dumpline('frame: ' + logo.ppstx(logo.mklist(frame[0][0])));
						frame = frame[1];
					}
				}
			};
			spin(r);
		});
		*/
	}
};

document.addEventListener('DOMContentLoaded', function () {
	boot();
});

