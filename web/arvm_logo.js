	
'use strict';

var logo_syms = {};

var checkany = function(v) {
	return true;
};

var checkstr = function(vml, fp, idx) {
	if(vml[fp + 2 + idx].kind != "lit")
		return false;
	if(typeof(vml[fp + 2 + idx].kind) != "string")
		return false;
	return true;
};

var logo_colors = [
	"red", "orange", "yellow", "green",
	"blue", "indigo", "violet", "brown",
	"black", "silver", "gold", "cyan",
	"magenta", "purple", "lavender", "teal",
	"tan", "maroon", "crimson",
	"goldenrod", "iris"
];

var consify = function(vml, car, cdr) {
	var a = vml.length;
	vml.push({kind: "frame", size: 4});
	vml.push({kind: "addr", val: a});
	vml.push({kind: "lit", val: "cons"});
	vml.push(car);
	vml.push(cdr);
	return {kind: "addr", val: a};
};

var addproc = function(name, predicates, handler) {
	logo_syms[name] = {
		kind: "proc",
		args: predicates.length,
		handler: mkargchandler(predicates.length, name, predicates, handler)
	};
};

// missing commands from old logo
// parsenote -- convert a note '4c4' string to a list
// compile -- access to the compiler
// parse -- access to the parser

addproc("help", [], function(vml, fp) {
		var s;
		for(s in logo_syms) {
			dumpline(s);
		};

		vml[fp + 1] = {kind: "nil"};
});

addproc("iszero", [checkany], function(vml, fp) {
	if(vml[fp + 2].kind != "lit") {
		vml[fp + 1] = {kind: "lit", val: 0};
	} else if(typeof(vml[fp + 2].val) == "number") {
		if(vml[fp + 2].val) {
			vml[fp + 1] = {kind: "lit", val: 0};
		} else {
			vml[fp + 1] = {kind: "lit", val: 1};
		}
	} else {
			vml[fp + 1] = {kind: "lit", val: 0};
	}

	return true;
});

addproc("isstring", [checkany], function(vml, fp) {
	if(vml[fp + 2].kind != "lit") {
		vml[fp + 1] = {kind: "lit", val: 0};
	} else if(typeof(vml[fp + 2].val) == "string") {
		vml[fp + 1] = {kind: "lit", val: 1};
	} else {
		vml[fp + 1] = {kind: "lit", val: 0};
	}

	return true;
});

addproc("strref", [checkstr, checklit], function(vml, fp) {
		var s, i;

		s = vml[fp + 2].val;
		i = vml[fp + 3].val;

		vml[fp + 1] = {kind: "lit", val: s[i]};
});

addproc("strlen", [checkstr], function(vml, fp) {
		var s;

		s = vml[fp + 2].val;

		vml[fp + 1] = {kind: "lit", val: s.length};
});


addproc("tonum", [checkstr], function(vml, fp) {
		var n;

		n = Number(vml[fp + 2].val);

		if(n == false) {
			vml[fp + 1] = {kind: "error", val: "could not convert to number"};
			return;	
		} else {
			vml[fp + 1] = {kind: "lit", val: n};
		}
});

addproc("delay", [checklit], function(vml, fp) {

	setTimeout(function() {
		vml[fp + 1] = lit(1);
	}, vml[fp + 2].val);

	return true;
});

addproc("_gotoxy", [checklit, checklit, checklit], function(vml, fp) {

	world.set_turtle(vml[fp + 2].val);
	world.current_turtle.gotoxy(vml[fp + 3].val, vml[fp + 4].val);

	vml[fp + 1] = lit(1);

	return true;
});

addproc("_fd", [checklit, checklit], function(vml, fp) {

	//var w;
	//w = logo.variables['var_pw'];
	//if(typeof(w[0]) == 'number')
		//world.current_turtle.width = w[0];

	world.set_turtle(vml[fp + 2].val);
	world.current_turtle.forward(vml[fp + 3].val);

	vml[fp + 1] = lit(1);

	return true;
});

addproc("drop", [checklit], function(vml, fp) {
	var i;

	i = vml[fp + 2].val;
	world.current_turtle.drop(i);

	vml[fp + 1] = lit(1);

	return true;
});

addproc("lift", [checklit], function(vml, fp) {
	var i;

	i = vml[fp + 2].val;
	world.current_turtle.lift(i);

	vml[fp + 1] = lit(1);

	return true;
});

addproc("new", [], function(vml, fp) {

	var turtle = mkturtle();
	var td = world.add_turtle(turtle);

	//var w;
	//w = logo.variables['var_pw'];
	//if(typeof(w[0]) == 'number')
		//world.current_turtle.width = w[0];
	//world.set_turtle(vml[fp + 2].val);
	//world.current_turtle.forward(vml[fp + 3].val);

	vml[fp + 1] = lit(td);

	return true;
});

addproc("_rt", [checklit, checklit], function(vml, fp) {

	world.set_turtle(vml[fp + 2].val);
	world.current_turtle.turn(vml[fp + 3].val * -1);

	vml[fp + 1] = lit(1);

	return true;
});

addproc("_lt", [checklit, checklit], function(vml, fp) {

	world.set_turtle(vml[fp + 2].val);
	world.current_turtle.turn(vml[fp + 3].val);

	vml[fp + 1] = lit(1);

	return true;
});

addproc("_pu", [checklit], function(vml, fp) {

	world.set_turtle(vml[fp + 2].val);
	world.current_turtle.penup();

	vml[fp + 1] = lit(0);

	return true;
});

addproc("_pd", [checklit], function(vml, fp) {

	world.set_turtle(vml[fp + 2].val);
	world.current_turtle.pendown();

	vml[fp + 1] = lit(0);

	return true;
});

addproc("pc", [], function(vml, fp) {
	var old_color;
	old_color = world.current_turtle.color;
	vml[fp + 1] = {kind: "lit", val: old_color};
	return;
});

addproc("setpc", [checklit], function(vml, fp) {
	var new_color;
	var old_color;

	new_color = vml[fp + 2].val;
	switch(new_color) {
		case "white": case "black": case "brown": case "grey":
		case "red": case "orange": case "yellow": case "green":
		case "blue": case "indigo": case "violet":
		case "pink": case "purple": case "magenta": case "lavender":
		case "teal": case "tan": case "maroon":
			old_color = world.current_turtle.color;
			world.current_turtle.color = new_color;

			vml[fp + 1] = {kind: "lit", val: old_color};
			return;
		default:
			vml[fp + 1] = {kind: "err", val: "invalid color name"};
			return;
	}
});

addproc("setwidth", [checklit], function(vml, fp) {
	var new_width, old_width;

	new_width = vml[fp + 2].val;

	old_width = world.current_turtle.width;
	world.current_turtle.width = new_width;

	vml[fp + 1] = { kind: "lit", val: old_width};

	return true;
});


addproc("scale", [checklit], function(vml, fp) {
	world.scale(vml[fp + 2].val);

	vml[fp + 1 ] = {kind: "nil"};

	return true;
});

addproc("display", [checklit], function(vml, fp) {

	dumpline(pp(vml[fp + 2]));

	vml[fp + 1] = lit(1);

	return true;
});

var logo_audio_context;

if(window.AudioContext || window.webkitAudioContext) {

	if(window.AudioContext)
		logo_audio_context = new AudioContext();
	else if(window.webkitAudioContext)
		logo_audio_context = new webkitAudioContext();
} else {
	logo_audio_context = false;
}

var playfi = function(f, i, next) {
	var frequency;

	var done = 0;
	var contfinisher = false;

	var f, i, k;

	if(!logo_audio_context) {
		next(false);
		return;
	}

	var context = logo_audio_context;

	var oscillator;
	if(f) {
		oscillator = context.createOscillator(); // Create sound source 1
		//var gain_node = context.createGain(); // Create gain node 2

		//oscillator.type = "sine"; // Sine wave
		oscillator.type = "square"; // Sine wave
		oscillator.frequency.value = f; // frequency in hertz
	} else {
		oscillator = context.createOscillator(); // Create sound source 1
		//var gain_node = context.createGain(); // Create gain node 2

		//oscillator.type = "sine"; // Sine wave
		oscillator.type = "square"; // Sine wave
		oscillator.frequency.value = 0; // frequency in hertz
	}

	oscillator.connect(context.destination); // Connect sound source 1 to output

	oscillator.start(context.currentTime);
	oscillator.stop(context.currentTime + i/1000);
	oscillator.onended = function() {
		oscillator.disconnect();
		next(true);
	};

		//cancel: function(next) {
		//	contfinisher = false;
		//	done = 1;
		//	oscillator.stop(context.currentTime);	
		//	oscillator.disconnect();
		//	next(logo.mknum(0));
		//}
};

addproc("__playnote", [checklit], function(vml, fp) {

	var f, i;

	var i_base = 2000;
	f = 400;
	i = 400;

	var is;
	is='';
	var cursor = 0;
	var s = vml[fp + 2].val;
	var l = s.length;
	var state = 0;
	var os;
	var ostart = 0;
	var ststart = 0;
	os='';
	var o;
	var st = 0;
	for(cursor = 0 ; cursor < l ; cursor++) {
		if(state == 0) {
			if(s[cursor].match(/[0-9]/)) {
				// do nothing
			} else {
				if(cursor == 0) {
					i = i_base;
				} else {
					is = s.substring(0, cursor);
					i = parseInt(is);
					if(!i) {
						vml[fp + 1] = {kind: "error", msg: "divide by zero"};
						return true;
					} else {
						i = i_base / i;
					}
				}
				if(s[cursor] == '.') {
					i = i * 1.5;
					ststart = cursor + 1;
					state = 1;
				} else {
					ststart = cursor;
					state = 1;
				}
			}
		} else if(state == 1) {
			if(s[ststart] == 'r') {
				playfi(0, i, function(r) {
					if(r) {
						vml[fp + 1] = {kind: lit, val: 1};
					} else {
						vml[fp + 1] = {kind: "error", msg: "no audio context"};
					}
				});
				return true;
			} else if(s[ststart] == 'a') st = 9;
			else if(s[ststart] == 'b') st = 11;
			else if(s[ststart] == 'c') st = 0;
			else if(s[ststart] == 'd') st = 2;
			else if(s[ststart] == 'e') st = 4;
			else if(s[ststart] == 'f') st = 5;
			else if(s[ststart] == 'g') st = 7;

			if(s[cursor].match(/[0-9]/)) {
				state = 3;
				ostart = cursor;
			} else if(s[cursor] == 's') {
				st++;
				state = 2;
			}
		} else if(state == 2) {
			if(s[cursor].match(/[0-9]/)) {
				state = 3;
				ostart = cursor;
			} else {
				vml[fp + 1] = {kind: "error", msg: "bad octave"};
				break;
			}
		} else if(state == 3) {
			if(s[cursor].match(/[0-9]/)) {
			} else {
				vml[fp + 1] = {kind: "error", msg: "bad octave"};
				break;
			}
		}
	}

	if(state == 1) {
		if(s[ststart] == 'r') {
			playfi(0, i, function(r) {
				if(r) {
					vml[fp + 1] = {kind: lit, val: 1};
				} else {
					vml[fp + 1] = {kind: "error", msg: "no audio context"};
				}
			});
			return true;
		}
	}

	os = s.substring(ostart, cursor);
	o = parseInt(os);

	f = 16.35 * (1 << o);
	f = f * Math.pow(1.05945, st);

	playfi(f, i, function(r) {
		if(r) {
			vml[fp + 1] = {kind: lit, val: 1};
		} else {
			vml[fp + 1] = {kind: "error", msg: "no audio context"};
		}
	});

	return true;
});

addproc("__play", [checklit, checklit], function(vml, fp) {

	var f, i;

	f = vml[fp + 2].val;
	i = vml[fp + 3].val;

	playfi(f, i, function(r) {
		if(r) {
			vml[fp + 1] = {kind: lit, val: 1};
		} else {
			vml[fp + 1] = {kind: "error", msg: "no audio context"};
		}
	});

	return true;
});

addproc("say", [checklit], function(vml, fp) {
	var phrase;

	phrase = vml[fp + 2];

	if(typeof(phrase.val) != "string") {
		arlog('phrase must be a string');
		vml[fp + 1] = {kind: lit, val: -1};	
		return true;
	}

	if(window.speechSynthesis) {
		world.current_turtle.proc(function(next) {
			var e;

			var msg = new SpeechSynthesisUtterance(phrase.val);
			msg.rate = .5;
			msg.addEventListener('end', function(ev) {
				vml[fp + 1] = {kind: lit, val: 0};
				next(false);
			}, false);
			window.speechSynthesis.speak(msg);
		});
		return true;
	} else {
		arlog('no speech synthesis');
		vml[fp + 1] = {kind: lit, val: -1};	
		return true;
	}
});

var gum;
if(navigator.getUserMedia) {
       gum = function(constraints, success, failure) {
               return navigator.getUserMedia(
                       constraints,
                       success,
                       failure
               );
       };
} else if(navigator.mozGetUserMedia) {
       gum = function(constraints, success, failure) {
               return navigator.mozGetUserMedia(
                       constraints,
                       success,
                       failure
               );
       };
} else if(navigator.webkitGetUserMedia) {
       gum = function(constraints, success, failure) {
               return navigator.webkitGetUserMedia(
                       constraints,
                       success,
                       failure
               );
       };
} else {
       gum = false;
}

var mkvid = function() {
       var w;
       w = document.createElement('video');
       w.style.backgroundColor = 'blue';
       w.style.width = '300px';
       w.style.height = '300px';
       w.style.display = 'none';
       w.controls = 'true';

       return w;
};

var frame_count = 0;
var cached_stream = false;

var mksnap = function(v) {
       var c;
       var s;
       var i;
       var n;

       s = 1;

		arlog('mksnap');

       c = document.createElement('canvas');
       c.style.display = 'none';

       c.width = v.videoWidth * s;
       c.height = v.videoHeight * s;
       c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
       
       i = document.createElement("img");
       i.src = c.toDataURL();
       document.body.appendChild(i);

       n = 'frame-' + (frame_count++);
       peerlube.putkey(n, c.toDataURL(), function() {
               logo.error('saved as ' + n);
               //v.stop();
       }, function() {
       });
       //logo.error('foo: ' + i.src + ' ' + c.width + ' -- ' + c.height);
       //document.body.appendChild(i);
};

var vplay = function(v, stream) {
                       logo.error('assigning src to ' + stream);
                        v.addEventListener('loadedmetadata', function(e) {      
                                alert('metadata loaded');
                                v.play();
                               alert('still here');
                        }, false);                                              
                        if ('mozSrcObject' in v) {                              
                                v.mozSrcObject = stream;                        
                                v.srcObject = stream;                           
                        } else {                                                
                                var s;                                          
                                                                                
                                s = window.URL.createObjectURL(stream);         
                                alert('s: ' + s + ' v: ' + v);                  
                                v.src = s;                                      
                        }                                                       
};

addproc("snap", [], function(vml, fp) {

	if(!gum) {
		arlog('no gum');
		vml[fp + 1] = {kind: "lit", val: -1};
		return true;
	}

	var v;
    //v = mkvid();
    //document.body.appendChild(v);

    if(cached_stream) {
      mksnap(cached_stream);
    } else gum(
    	{ video: true, audio: false},
        function(stream) {
                v = document.createElement('video');
                document.body.appendChild(v);
                cached_stream = v;
                v.style.width='640px';
                v.style.height='480px';
                v.style.visibility='hidden';
				arlog('about to create object url');
                v.src = window.URL.createObjectURL(stream);
                v.addEventListener('loadedmetadata', function(e) {
                v.play();
                setTimeout(function() {
                        mksnap(v);
                }, 1000);
         }, false);
         v.play();
         }, function() {
                  alert('got no media');
        });

	
		vml[fp + 1] = {kind: "lit", val: 0};	
		return;
});

addproc("ask", [checklit], function(vml, fp) {
	var r;
	var prompt = vml[fp + 2];

	r = window.prompt(prompt.val);
	if(r) {
		vml[fp + 1] = {kind: "lit", val: r};
		return;
	} else {
		vml[fp + 1] = {kind: "nil"};
		return;
	}
});

addproc("metrics", [checklit], function(vml, fp) {
	var text = vml[fp + 2];

	var i,l,j,k,foo,acc;

    if(typeof(text.val) != "string") {
		vml[fp + 1] = {kind: "nil"};
		return;
	}

	foo = [];
	l = text.val.length;
	for(i = 0 ; i < l ; i++) {
		for(j=0;j<fontdata.length;j++) {
			if(text.val[i] == fontdata[j][0]) {
				acc = [];
				for(k=2;k<fontdata[j].length;k++) {
					acc.push([
                       fontdata[j][k][0],
                       fontdata[j][k][1]
                   ]);
				}
				foo.push(acc);
			}
		}
	}


	var x;
	var carry = {kind: "nil"};
	for(x = 1 ; x <= acc.length ; x++) {
		var p;
		p = consify(vml, {kind: "lit", val: acc[acc.length - x][0]},
					{kind: "lit", val: acc[acc.length - x][1]});
		carry = consify(vml, p, carry);
	}

	vml[fp + 1] = carry;

	return;
});

addproc("pos", [], function(vml, fp) {
		vml[fp + 1] = consify(vml,
			{kind: "lit", val: world.current_turtle.x},
			consify(vml,
				{kind: "lit", val: world.current_turtle.y},
				consify(vml,
					{kind: "lit", val: world.current_turtle.z},
					{kind: "nil"}
				)
			)
		);
});

addproc("home", [], function(vml, fp) {
	world.current_turtle.home();
	vml[fp + 1] = {kind: "nil"};
});

addproc("svg", [], function(vml, fp) {
	var lines;
	var x_origin = 0;
	var y_origin = 0;
	var width = 100;
	var height = 100;
	var scale = 1;
	var t = "";
	var from_x;
	var from_y;
	var to_x;
	var to_y;
	var p;

	lines = world.current_turtle.lines;
	if(!lines.length) {
		vml[fp + 1] = {kind: "nil"};
		return;
	}

	var bb_ul_x, bb_ul_y, bb_lr_x, bb_lr_y;
	bb_ul_x = lines[0].coords[0];
	bb_ul_y = lines[0].coords[1];
	bb_lr_x = lines[0].coords[0];
	bb_lr_y = lines[0].coords[1];
	for(x = 1; x < lines.length ; x++) {
		if(lines[x].coords[0] < bb_ul_x) bb_ul_x = lines[x].coords[0];
		if(lines[x].coords[1] > bb_ul_y) bb_ul_y = lines[x].coords[1];
		if(lines[x].coords[3] < bb_ul_x) bb_ul_x = lines[x].coords[3];
		if(lines[x].coords[4] > bb_ul_y) bb_ul_y = lines[x].coords[4];
		if(lines[x].coords[0] > bb_lr_x) bb_lr_x = lines[x].coords[0];
		if(lines[x].coords[1] < bb_lr_y) bb_lr_y = lines[x].coords[1];
		if(lines[x].coords[3] > bb_lr_x) bb_lr_x = lines[x].coords[3];
		if(lines[x].coords[4] < bb_lr_y) bb_lr_y = lines[x].coords[4];
	}
	width = bb_lr_x - bb_ul_x;
	height = bb_ul_y - bb_lr_y;

	t = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>";
	t += "<!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.0//EN\" \"http://www.w3.org/TR/2001/REC-SVG-20010904/DTD/svg10.dtd\">\n";
	t += "<svg xmlns=\"http://www.w3.org/2000/svg\">\n";
	//t += "<g transform=\"translate(" + (width/2) + "," + (height/2) + ") rotate(180," + (width/2) + "," + (height/2) + "\">";
	t += "<g transform=\"translate(" + (width/2) + "," + (height) + ") scale(1, -1)\">";

	for(x=0; x < lines.length ; x++) {
		p = lines[x];
		//dumpline("P: " + JSON.stringify(p));
		t += "<polyline points=\"" +
			(p.coords[0]) + "," +
			(p.coords[1]) + " " +
			(p.coords[3]) + "," +
			(p.coords[4]) + "\"" +
			" style=\"fill:none;stroke:" + p.coords[6] + ";stroke-width:" + p.coords[7] + "\" />\n"
	}

	t += "</g>\n";
	t += "</svg>\n";

	var new_window, d;
	var new_window, d;
	new_window = window.open("javascript:123;","export","");
	d = new_window.document;
	while(d.body.childNodes.length) {
		d.body.removeChild(d.body.childNodes[0]);
	}

	alert(t);
	document.body.appendChild(document.createTextNode(t));
	t = btoa(t);
	t="data:image/svg+xml;base64," + t;
	new_window.location = t;

	vml[fp + 1] = {kind: "nil"};
});

addproc("pickcolor", [], function(vml, fp) {
	var div;

	var w = 25;
	var cols = 4;
	var rows = (logo_colors.length + (cols - (logo_colors.length % cols))) / cols;

	div = document.createElement('div');
	div.style.position = 'absolute';
	div.style.top = '400px';
	div.style.left = '400px';
	div.style.width = (w * cols) + 'px';
	div.style.height = (w * rows) + 'px';
	div.style.background = 'blue';
	div.style.zIndex = 3;

	var canvas = document.createElement('canvas');
    canvas.style.width = (w * cols) + 'px';
    canvas.style.height = (w * rows) + 'px';
    canvas.width = (w * cols);
    canvas.height = (w * rows);

	var context;
	context = canvas.getContext('2d');

	var x, c;

	x = 0;
	for(c in logo_colors) {
		context.strokeStyle = logo_colors[c];
		context.lineCap = "butt";
		context.lineWidth = w;
		context.beginPath();
		context.moveTo((w/2) + (w * (x % cols)), w * (x - (x % cols))/cols);
		context.lineTo((w/2) + (w * (x % cols)), w * (1 + (x - (x % cols))/cols));
		context.stroke();
		x += 1;
	}

	div.appendChild(canvas);

	var process = function(x, y) {
		var row, col;
		row = Math.floor(y / w);
		col = Math.floor(x / w);

		var color_index = (row * cols) + col;
		if(color_index >= logo_colors.length)
			return;

		world.current_turtle.color = logo_colors[color_index];
	};

	div.addEventListener('click', function(e) {
		process(e.offsetX, e.offsetY);
		e.stopPropagation();
		e.preventDefault();
	}, true);
	div.addEventListener('mousedown', function(e) {
		process(e.offsetX, e.offsetY);
		e.stopPropagation();
		e.preventDefault();
	}, true);
	div.addEventListener('mouseup', function(e) {
		process(e.offsetX, e.offsetY);
		e.stopPropagation();
		e.preventDefault();
	}, true);
	div.addEventListener('touchstart', function(e) {
		process(
			e.touches[0].pageX - 400,
			e.touches[0].pageY - 400
		);
		e.stopPropagation();
		e.preventDefault();
	}, true);

	document.body.appendChild(div);

	vml[fp + 1] = {kind: "lit", val: "green"};

});

/*
-logo.variables["var_record"] = logo.mkvar({
-       kind: "proc",
-       handler: function(next, seconds) {
-
-               var buffered_data;
-               var rval;
-               buffered_data = [];
-               rval = {
-                       kind: "audio",
-                       val: buffered_data
-               }
-
-               var contfinisher = false;
-               var done = false;
-
-               if(!logo_audio_context) {
-                       return returner(next, logo.mkerr(logo.mkstr('no audio context')));
-               }
-
-               if(seconds.kind != "num") {
-                       return returner(next, logo.mkerr(logo.mkstr('seconds must be a number, not a ' + seconds.kind)));
-               }
-
-               if(seconds.val < 0) {
-                       logo.error('seconds must be greater than zero');
-                       return returner(next, logo.mkerr(logo.mkstr('seconds must be greater than zero')));
-               }
-
-               gum({audio: true}, function(stream) {
-                       var streamsource, c;
-
-                       streamsource = logo_audio_context.createMediaStreamSource(stream);
-
-                       logo.error('recording');        
-
-                       var bufferSize = 2048;
-                       var recorder;
-                       recorder = logo_audio_context.createScriptProcessor(bufferSize, 2, 2);
-                       recorder.onaudioprocess = function(e) {
-                               if(done) {
-                                       logo.error('still recording!');
-                                       //return next();
-                               }
-
-                               var data1 = e.inputBuffer.getChannelData(0);
-                               var data2 = e.inputBuffer.getChannelData(1);
-                               data1 = new Float32Array(data1);
-                               data2 = new Float32Array(data2);
-
-                               buffered_data.push([data1, data2]);
-
-                               //logo.error('foo: ' + data1.length + ',' + data2.length);
-                               //logo.error('.');
-                       };
-
-                       streamsource.connect(recorder);
-                       recorder.connect(logo_audio_context.destination);
-       
-                       setTimeout(function() {
-                               logo.error('done');
-                               streamsource.disconnect(recorder);
-                               recorder.disconnect(logo_audio_context.destination);
-                               done = true;
-                               if(contfinisher) {
-                                       c = contfinisher;
-                                       contfinisher = false;
-                                       c();
-                               }
-                       }, seconds.val * 1000);
-               }, function() {
-
-                       logo.error('failed');
-               });
-
-               var kk=0;
-               return returner(next, {
-                       kind: 'promise',
-                       desc: "asynchronous recording: " + seconds.val + " seconds",
-                       forced: false,
-                       force: function(next) {
-                               kk++;
-                               if(kk != 1) {
-                                       logo.error("whoa! record continuation pulled more than once!");
-                                       return;
-                               }
-                               if(done) {
-                                       next(rval);
-                               } else {
-                                       contfinisher = function() {
-                                               next(rval);
-                                       };
-                               }
-                       }
-               });
-//
-//// success callback when requesting audio input stream
-//function gotStream(stream) {
-//    window.AudioContext = window.AudioContext || window.webkitAudioContext;
-//    var audioContext = new AudioContext();
-//
-//    // Create an AudioNode from the stream.
-//    var mediaStreamSource = audioContext.createMediaStreamSource( stream );
-//
-//    // Connect it to the destination to hear yourself (or any other node for processing!)
-//    mediaStreamSource.connect( audioContext.destination );
-//}
-
-//navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia;
-//navigator.getUserMedia( {audio:true}, gotStream );
-//
-
-       
-       },
-       args: ["seconds"]
-});

-logo.variables["var_playback"] = logo.mkvar({
-       kind: "proc",
-       handler: function(next, audio) {
-               var done = 0;
-               var contfinisher = false;
-
-               logo.error("this is just broken");
-
-               if(!logo_audio_context) {
-                       return returner(next, logo.mkerr(logo.mkstr('no audio context')));
-               }
-
-               if(audio.kind != "audio") {
-                       logo.error("playback accepts audio, not " + audio.kind);
-                       return returner(next, logo.mknum(0));
-               }
-
-               var context = logo_audio_context;
-
-               var bufferSize = 2048;
-               var player;
-               player = logo_audio_context.createScriptProcessor(bufferSize, 2, 2);
-               var x;
-               player.onaudioprocess = function(e) {
-                       if(done) {
-                               logo.error('still playing!');
-                               return returner(next, false);
-                       }
-                       if(x == audio.val.length) {
-                               //logo.error('done foo!');
-                               player.disconnect(logo_audio_context.destination);
-                               if(contfinisher) {
-                                       var c;
-                                       c = contfinisher;
-                                       contfinisher = false;
-                                       return next(c());
-                               }
-                               return returner(next, false);
-                       }
-
-                       var data1 = e.outputBuffer.getChannelData(0);
-                       var data2 = e.outputBuffer.getChannelData(1);
-                       var y, l;
-                       l = audio.val[x];
-                       for(y=0;y<l[0].length;y++) {
-                               data1[y]=l[0][y];
-                       }
-                       for(y=0;y<l[1].length;y++) {
-                               data2[y]=l[1][y];
-                       }
-
-                       x++;
-
-                       //logo.error('foo: ' + data1.length + ',' + data2.length);
-                       //logo.error('.');
-               };
-
-               x=0;
-               player.connect(logo_audio_context.destination);
-
-               var kk=0;
-               return returner(next, {
-                       kind: "promise",
-                       desc: "asynchronous play: ",
-                       forced: false,
-                       force: function(next) {
-                               logo.error('forcing playback');
-                               kk++;
-                               if(kk != 1) {
-                                       logo.error("whoa! play continuation pulled more than once!");
-                                       return;
-                               }
-                               if(done) {
-                                       logo.error('it was already done');
-                                       next(logo.mknum(0));
-                               } else {
-                                       //logo.error('assigning contfinisher');
-                                       contfinisher = function() {
-                                               logo.error('playback event finished. passing return value onto waiting function');
-                                               next(logo.mknum(0));
-                                       };
-                               }
-                       },
-                       cancel: function(next) {
-                               logo.error('playback cancelled');
-                               contfinisher = false;
-                               done = 1;
-                               next(logo.mknum(0));
-                       }
-               });
-       },
-       args: ["audio"]
-});

*/

/*
-logo.bind_global("show", logo.mkvar({kind: "stx", val: function(stx, start, locals, next) {
-       var label, body, vars, v;
-
-       if((start + 1) >= stx.length) {
-               return returner(next, logo.mkerr(logo.mkstr('show LABEL: you had no LABEL')));
-       }
-
-       label=stx[start + 1];
-       if(label.kind != "sym") {
-               return returner(next, logo.mkerr(logo.mkstr('LABEL must be a symbol')));
-       };
-
-       if(!(v = logo.variables["var_" + label.val])) {
-               return returner(next, logo.mkerr(logo.mkstr('there is no ' + label.val)));
-       }
-
-       if(v.kind != 'var') {
-               return returner(next, logo.mkerr(logo.mkstr(label.val + ' is not bound to a variable')));
-       }
-
-       if(v.val.kind == 'proc') {
-               logo.error(logo.ppstx(v.val.stx));
-               return returner(next, logo.mklist([ logo.mkfalse, logo.mknum(start + 2 ) ]));
-       }
-       return returner(next, logo.mklist([ logo.mkfalse, logo.mknum(start + 2 ) ]));
-}, args: [ "varname" ]}));
-logo.bind_global("pi", logo.mkvar(logo.mknum(3.14159265)));
-logo.bind_global("pw", logo.mkvar(logo.mknum(1)));
-if(document.fullscreenEnabled) {
-       //world.dumpline('fullscreen available!');
-} else if(document.webkitFullscreenEnabled) {
-       // safari full screen doesn't work for me yet
-       //world.dumpline('safari fullscreen available!');
-       logo.bind_global("fs", logo.mkvar({
-               kind: "proc",
-               handler: function(next) {
-                       world.dumpline('switching to full screen');
-                       //document.body.requestFullscreen();
-                       if(document.body.ALLOW_KEYBOARD_INPUT)
-                               world.dumpline('foo');
-                       document.body.webkitRequestFullscreen(document.body.ALLOW_KEYBOARD_INPUT);
-                       world.dumpline('in full screen');
-                       return returner(next, logo.mknum(0));
-               },
-               args: []
-       }));
-} else if(document.mozFullScreenEnabled) {
-       logo.bind_global("fs", logo.mkvar({
-               kind: "proc",
-               handler: function(next) {
-                       if(document.mozFullScreenElement) {
-                               document.mozCancelFullScreen();
-                       } else {
-                               document.body.mozRequestFullScreen();
-                       }
-                       return returner(next, logo.mknum(0));
-               },
-               args: []
-       }));
-}
-logo.bind_global("env", logo.mkvar({
-       kind: "proc",
-       handler: function(next) {
-               var frame,x;
-
-               frame = logo.locals;
-               while(frame.length) {
-                       world.dumpline('frame: ');
-                       for(x in frame[0]) {
-                               if(x.match(/^var_/)) {
-                                       world.dumpline('var: ' + x.replace(/^var_/,"") + ': ' + logo.ppstx(frame[0][x].val));
-                               }
-                       }
-                       //world.dumpline(JSON.stringify(frame[0]));
-                       frame=frame[1];
-               }
-               return returner(next, logo.mknum(0));
-       },
-       args: []
-}));
-
-logo.bind_global("debug", logo.mkvar({
-       kind: "proc",
-       handler: function(next, msg) {
-               world.current_turtle.debug(msg);
-               return returner(next, logo.mknum(0));
-       },
-       args: ["msg"]
-}));
-// world specific commands
-logo.bind_global("grid", logo.mkvar({
-       kind: "proc",
-       handler: function(next, val) {
-               world.current_turtle.grid = val.val;
-               world.current_turtle.show();
-               return returner(next, logo.mknum(0));
-       },
-       args: ["val"]
-}));
-
-logo.bind_global("print", logo.mkvar({
-       kind: "proc",
-       handler: function(next) {
-               //window.print();
-               world.print();
-               return returner(next, logo.mknum(0));
-       },
-       args: []
-}));
-
-logo.bind_global("save", logo.mkvar({
-       kind: "proc",
-       handler: function(next) {
-               var s;
-               s=JSON.stringify(world.commands);
-               window.localStorage.setItem("checkpoint", s);
-               return returner(next, logo.mknum(0));
-       },
-       args: []
-}));
-
-logo.bind_global("restore", logo.mkvar({
-       kind: "proc",
-       handler: function(next) {
-               var c;
-               var a;
-               var i;
-               var these_commands;
-
-               c = window.localStorage.getItem("checkpoint");
-               if(c) {
-                       these_commands = JSON.parse(c);
-                       world.current_turtle.reset();
-                       for(i=0;i<these_commands.length;i++) {
-                               a = logo.parse(these_commands[i]);
-                               do_command(a, 0);
-                       }
-                       world.commands = these_commands;
-               }
-               return returner(next, logo.mknum(0));
-       },
-       args: []
-}));
-
-logo.variables["var_pc"] = logo.mkvar({
-       kind: "proc",
-       handler: function(next, ahead) {
-               var old_color;
-
-               switch(ahead.val) {
-               case "white": case "black": case "brown": case "grey":
-               case "red": case "orange": case "yellow": case "green":
-               case "blue": case "indigo": case "violet":
-               case "pink": case "purple": case "magenta": case "lavender":
-               case "teal":
-               case "tan":
-               case "maroon":
-                       old_color = world.current_turtle.color;
-                       world.current_turtle.color = ahead.val;
-
-                       return returner(next, logo.mkstr(old_color));
-               default:
-                       return returner(next, logo.mkerr(logo.mkstr('unknown color: ' + ahead.val)));
-                       break;
-               }
-       },
-       args: ["color"]
-});
-logo.variables["var_cs"] = logo.mkvar({
-       kind: "proc",
-       handler: function(next) {
-               world.current_turtle.clear();
-
-               return returner(next, logo.mknum(0));
-       },
-       args: []
-});
-
-logo.variables["var_st"] = logo.mkvar({
-       kind: "proc",
-       handler: function(next) {
-               world.current_turtle.visible=1;
-               world.current_turtle.show();
-
-               return returner(next, logo.mknum(0));
-       },
-       args: []
-});
-
-logo.variables["var_ht"] = logo.mkvar({
-       kind: "proc",
-       handler: function(next) {
-               world.current_turtle.visible=0;
-               world.current_turtle.hide();
-
-               return returner(next, logo.mknum(0));
-       },
-       args: []
-});
-
-logo.variables["var_reset"] = logo.mkvar({
-       kind: "proc",
-       handler: function(next) {
-               world.current_turtle.reset();
-
-               return returner(next, logo.mknum(0));
-       },
-       args: []
-});
-logo.variables["var_undo"] = logo.mkvar({
-       kind: "proc",
-       handler: function(next) {
-               world.current_turtle.reset();   
-               logo.error('cannot undo yet');
-
-               return returner(next, logo.mknum(0));
-       },
-       args: []
-});
-
go.variables["var_lines"] = logo.mkvar({
-       kind: "proc",
-       handler: function(next) {
-               var a, l, x, c;
-
-               l = world.current_turtle.lines;
-               a = [];
-               for(x = 0 ; x < l.length ; x++) {
-                       if(l[x].kind == "line") {
-                               c = l[x].coords;
-                               a.push(logo.mklist([
-                                       logo.mknum(c[0]),
-                                       logo.mknum(c[1]),
-                                       logo.mknum(c[2]),
-                                       logo.mknum(c[3]),
-                                       logo.mknum(c[4]),
-                                       logo.mknum(c[5]),
-                                       logo.mkstr(c[6]),
-                                       logo.mknum(c[7])
-                               ]));
-                       }
-               }
-               return returner(next, logo.mklist(a));
-       },
-       args: []
-});
go.variables["var_cameo"] = logo.mkvar({
-       kind: "proc",
-       handler: function(next, lines, x_origin, y_origin, width, height, scale) {
-               // from http://ohthehugemanatee.net/2011/07/gpgl-reference-courtesy-of-graphtec/
-
-               if(lines.kind != "list") {
-                       return returner(next, logo.mkerr(logo.mkstr("lines must be a list")));
-               }
-               if(x_origin.kind != "num") {
-                       return returner(next, logo.mkerr(logo.mkstr("x_origin must be a number")));
-               }
-               if(y_origin.kind != "num") {
-                       return returner(next, logo.mkerr(logo.mkstr("y_origin must be a number")));
-               }
-               if(width.kind != "num") {
-                       return returner(next, logo.mkerr(logo.mkstr("width must be a number")));
-               }
-               if(height.kind != "num") {
-                       return returner(next, logo.mkerr(logo.mkstr("height must be a number")));
-               }
-               if(scale.kind != "num") {
-                       return returner(next, logo.mkerr(logo.mkstr("scale must be a number")));
-               }
-
-               var pre_commands;
-               var post_commands;
-               var t,x,p;
-
-               //
-               //if(world.current_turtle.lines.length == 0) {
-               //        return logo.mknum(0);
-               //}
-               //
-               var spi = 508; // 508 steps per inch 2.54 TPI * 200 steps (1.8 deg stepper)
-               x_origin = x_origin.val * spi;
-               y_origin = y_origin.val * spi;
-               width = width.val * spi;
-               height = height.val * spi;
-               scale = scale.val;
-
-               // some additional possible commands
-               // TC3,force_value perhaps 1-31?
-               // TC1,10*velocity_value perhaps 1-60? what does scale even mean
-               // TC2,10 quality or acceleration? 1-3?
-               // TC5,0 commit changes?
-               // W -- circle
-               // M -- move
-               // O -- relative move
-               // D -- draw
-               // E -- relative draw
-               // FW -- media. perhaps this is like cut depth?
-               // some from https://github.com/vishnubob/silhouette/blob/master/src/gpgl.py
-               pre_commands=[
-                       "",                                                                             
-                       "!10,0",                // speed?
-                       //"TT",                   // ??                                                   
-                       "H",                    // go home                                              
-                       //"TB50",                 // ??                                                   
-                       //"1",                                                                            
-                       //"TB50,0",                                                                       
-                       //"FC0",                  // cutter offset?
-                       //"TB99",                                                                         
-                       //"FM1",                                                                          
-                       //"TB50,1",             // flip from landscape to portrait?
-
-                       //"FO5587",                                                                       
-                       //"&100,100,100",         // set the scale                                        
-
-                       "\\0,0",                // perhaps flipped x and y
-                       "Z" + height + "," + width,     // also flipped
-                       //"\\30,30",              // write lower left                                     
-                       //"Z4120,5588",           // write upper right                                    
-                       //"\\6000,3000",
-                       //"Z0,0",
-
-                       "FX10,0",               // pressure
-                       "L0",                   // line type
-               ];
-               post_commands=[
-                       "H",                    // go home
-                       //"&1,1,1",               // scaling factor
-                       //"TB50,0",
-                       //"FO0",
-                       //"H",                    // go home
-                       "",
-                       ""
-               ];
-               t="";
-               for(x=0;x<pre_commands.length;x++) {
-                       t += pre_commands[x] + "\x03";
-               }
-               var to_x, to_y;
-               // 4000 default
-               // 3000 moves it to the right by 100 logo units
-               // 5000 moves it to the left by 100 logo units
-               //
-               //for(x=0;x<dummy_commands.length;x++) {
-               //        t += dummy_commands[x] + "\x03";
-               //}
-               //
-
-               for(x=0; x < lines.val.length ; x++) {
-                       p = lines.val[x];
-                       p = [ p.val[0].val, p.val[1].val, p.val[2].val, p.val[3].val,
-                             p.val[4].val, p.val[5].val, p.val[6].val, p.val[7].val ];
-                       from_x = Math.floor(x_origin + (scale * p[0]));
-                       from_y = Math.floor(y_origin - (scale * p[1]));
-                       if((from_x != to_x) || (from_y != to_y)) {
-                               t += "M" + from_y + ',' + from_x + "\x03";
-                       }
-                       to_x = Math.floor(x_origin + (scale * p[3]));
-                       to_y = Math.floor(y_origin - (scale * p[4]));
-
-                       t += "D" + to_y + ',' + to_x + "\x03";
-               }
-               for(x=0;x<post_commands.length;x++) {
-                       t += post_commands[x] + "\x03";
-               }
-               //t=btoa(t);
-               //t="data:application/octet-stream;base64," + t;
-
-               var new_window, d;
-               new_window = window.open("javascript:123;","export","");
-               d = new_window.document;
-               while(d.body.childNodes.length) {
-                       d.body.removeChild(d.body.childNodes[0]);
-               }
-
-               //var a;
-               //a=document.createElement('a');
-               //a.appendChild(document.createTextNode('(cameo file)'));
-               //a.href=t;
-               ////logo.printline(a);
-               //document.body.appendChild(a);

-               d.body.appendChild(document.createTextNode(t)); 
-               return returner(next, logo.mknum(0));
-       },
-       args: ["lines", "x_origin", "y_origin", "width", "height", "scale"]
-});
-
-logo.variables["var_export"] = logo.mkvar({
-       kind: "proc",
-       handler: function(next) {
-               var d, x, t, new_window;
-               var lastx, lasty, lastz;
-               var printline;
-               var scale = 200;
-
-               if(world.current_turtle.lines.length == 0) {
-                       return returner(next, logo.mkerr(logo.mkstr('no lines to export')));
-               }
-               new_window = window.open("javascript:123;","export","width=200");
-               d = new_window.document;
-               while(d.body.childNodes.length) {
-                       d.body.removeChild(d.body.childNodes[0]);
-               }
-
-               lastx = "x";
-               lasty = "x";
-               lastz = "x";
-
-               printline = function(l) {
-                       if(l.kind == "line") {
-                               l=l.coords;
-                       if(     (lastx == Math.floor((scale*l[0])+.5))
-                               && (lasty == Math.floor((scale*l[1])+.5))
-                               && (lastz == Math.floor((scale*l[2])+.5))) {
-                       } else {
-                               if(typeof(lastx) == "number") {
-                               t=d.createTextNode("g "
-                                                  + lastx
-                                                  + " "
-                                                  + lasty
-                                                  + " "
-                                                  + "2");
-                               d.body.appendChild(t);
-                               d.body.appendChild(d.createElement('br'));
-
-                               t=d.createTextNode("g "
-                                                  + Math.floor((scale*l[0])+.5)
-                                                  + " "
-                                                  + Math.floor((scale*l[1])+.5)
-                                                  + " "
-                                                  + "2");
-                               d.body.appendChild(t);
-                               d.body.appendChild(d.createElement('br'));
-                               }
-
-                               t=d.createTextNode("g "
-                                                  + Math.floor((scale*l[0])+.5)
-                                                  + " "
-                                                  + Math.floor((scale*l[1])+.5)
-                                                  + " "
-                                                  + Math.floor((scale*l[2])+.5));
-                               d.body.appendChild(t);
-                               d.body.appendChild(d.createElement('br'));
-                       }
-                       t=d.createTextNode("g "
-                                          + Math.floor((scale*l[3])+.5)
-                                          + " "
-                                          + Math.floor((scale*l[4])+.5)
-                                          + " "
-                                          + Math.floor((scale*l[5])+.5));
-                       d.body.appendChild(t);
-                       d.body.appendChild(d.createElement('br'));
-
-                       lastx=Math.floor((scale*l[3])+.5);
-                       lasty=Math.floor((scale*l[4])+.5);
-                       lastz=Math.floor((scale*l[5])+.5);
-                       }
-               };
-               printline(world.current_turtle.lines[0]);
-
-               for(x=1;x<world.current_turtle.lines.length;x++) {
-                       printline(world.current_turtle.lines[x]);
-               }
-               return returner(next, logo.mknum(0));
-       },
-       args: []
-});
*/
