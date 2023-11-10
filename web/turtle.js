'use strict';
var field = {
	width: 800,
	height: 800,
	origin_x: 200,
	origin_y: 200,
	scale: 1
};

var context;
var context2;
var c;
var resize_canvas;

var dpi_scaling = 2;

var timeout = 10;

var mkworld = function() {
	var drawlinexyz;

	var world = new Object;
	var turtles = new Array;
	var tcount = 0;

	world.current_turtle = false;
	world.commands = new Array;

	world.add_turtle = function(turtle) {
		if(!turtle)
			return alert('no turtle!');
		if(turtles.indexOf(turtle) == -1) {
			if(turtle.world) {
				error('turtle is in another world');
			}
			turtles.push(turtle);
			turtle.world = world;

			turtle.descriptor = ++tcount;

			turtle.show();

			return turtle.descriptor;
		} else {
			error('turtle is already in this world');
		}
	};

	world.remove_turtle = function(turtle) {
		var i;
		i = turtles.indexOf(turtle);
		if(i == -1) {
			error('turtle is not in this world');
		} else {
			turtles.splice(i, 1);
			turtle.world = false;
			if(world.current_turtle == turtle.descriptor) {
				world.current_turtle = false;
			}
			turtle.descriptor = false;
		}
	};

	world.set_turtle = function(turtle_descriptor) {
		var x;
		for(x in turtles) {
			if(turtles[x].descriptor == turtle_descriptor) {
				world.current_turtle = turtles[x];
				return;
			}
		}
		error('no turtle with descriptor ' + turtle_descriptor);
	};

	world.refresh = function() {
		var x, y, l, t;
		resize_canvas();
		for(y = 0 ; y < turtles.length ; y++) {
			t = turtles[y];
			for(x = 0 ; x < t.lines.length ; x++) {
				l = t.lines[x];
				if(l.kind == 'line') {
					l=l.coords;
					drawlinexyz(field,context,l[0], l[1], l[2], l[3], l[4], l[5], l[6], l[7]);
				}
			}
			t.show();
		}
	};

	window.addEventListener('resize', function(e) {
		world.refresh();
	}, false);

	var last_logo_coords = false;

	window.addEventListener('mousemove', function(e) {
		var these_coords = window2logo(e.offsetX, e.offsetY);
		if(these_coords)
			last_logo_coords = these_coords;
	}, false);

	window.addEventListener('mousedown', function(e) {
		if(e.shiftKey) {
			var start_x, start_y, start_origin_x, start_origin_y;
			start_x = e.offsetX;
			start_y = e.offsetY;
			start_origin_x = field.origin_x;
			start_origin_y = field.origin_y;

			var h = function(e) {
				var this_x, this_y;

				this_x = e.offsetX;
				this_y = e.offsetY;

				field.origin_x =
					start_origin_x + (this_x - start_x) *
					dpi_scaling / field.scale;
				field.origin_y =
					start_origin_y + (this_y - start_y) *
					dpi_scaling / field.scale;

				world.refresh();
				e.stopPropagation();
				e.preventDefault();
			};

			var u = function(e) {
				window.removeEventListener('mousemove', h);
				window.removeEventListener('mouseup', u);
				e.stopPropagation();
				e.preventDefault();
			};

			window.addEventListener('mousemove', h);
			window.addEventListener('mouseup', u);

			e.stopPropagation();
			e.preventDefault();
		}
	}, false);

	var window2logo = function(window_x, window_y) {
		var logo_x, logo_y;

		if(typeof(window_x) != "number")
			return;
		if(typeof(window_y) != "number")
			return;

		logo_x = window_x * dpi_scaling / field.scale;
		logo_y = window_y * dpi_scaling / field.scale;

		return { x: logo_x - field.origin_x, y: field.origin_y - logo_y };
	};

	var oldpen = 0;

	window.addEventListener('touchstart', function(e) {
		if(e.touches[0].force) {
			var logo_coords = window2logo(e.touches[0].pageX, e.touches[0].pageY);
			//arlog('c: ' + JSON.stringify(logo_coords));

			oldpen = world.current_turtle.pen;
			world.current_turtle.pen = 0;
			world.current_turtle.gotoxy(logo_coords.x, logo_coords.y);
			world.current_turtle.pen = 1;
			world.current_turtle.hide();

			e.stopPropagation();
			e.preventDefault();
		}
	}, false);
	window.addEventListener('touchmove', function(e) {
		if(e.touches[0].force) {
			var logo_coords = window2logo(e.touches[0].pageX, e.touches[0].pageY);

			world.current_turtle.gotoxy(logo_coords.x, logo_coords.y);

			e.stopPropagation();
			e.preventDefault();
		}
	}, false);
	window.addEventListener('touchend', function(e) {
		if(e.touches[0].force) {
			world.current_turtle.pen = oldpen;
			world.current_turtle.show();
		}
	}, false);
	window.addEventListener('touchcancel', function(e) {
		//arlog('touchcancel');
	}, false);
	window.addEventListener('touchforcechange', function(e) {
		//arlog('touchforcechange');
	}, false);
	var starting_scale = false;
	var starting_width = false;
	var starting_height = false;
	var starting_origin_x = false;
	var starting_origin_y = false;
	var starting_client_x = false;
	var starting_client_y = false;
	var starting_logo_center_x = false;
	var starting_logo_center_y = false;
	window.addEventListener('gesturestart', function(e) {
			e.stopPropagation();
			e.preventDefault();

			starting_scale = field.scale;
			starting_width = field.width;
			starting_height = field.height;
			starting_origin_x = field.origin_x;
			starting_origin_y = field.origin_y;
			starting_client_x = e.clientX;
			starting_client_y = e.clientY;

			var logo_center_x;
			var logo_center_y;

			var these_coords = window2logo(e.clientX, e.clientY);
			if(these_coords) {
				starting_logo_center_x = these_coords.x;
				starting_logo_center_y = these_coords.y;
			} else {
				starting_logo_center_x = field.width / 2;
				starting_logo_center_y = field.height / 2;
			}
	}, false);
	window.addEventListener('gesturechange', function(e) {
		//var scale_factor = Math.pow(1.015, e.scale);
		if(!e.scale)
			return;

		var scale_factor = starting_scale * e.scale;

		if(scale_factor) {

			// we want that same point to
			// be in the center after the scaling 
			// positive scale factors mean a larger field
			field.origin_x = ((starting_origin_x + starting_logo_center_x) * e.scale) - starting_logo_center_x;
			field.origin_y = ((starting_origin_y - starting_logo_center_y) * e.scale) + starting_logo_center_y;
			field.origin_x = ((starting_origin_x + starting_logo_center_x) / e.scale) - starting_logo_center_x;
			field.origin_y = ((starting_origin_y - starting_logo_center_y) / e.scale) + starting_logo_center_y;

			field.width = starting_width / e.scale;
			field.height = starting_height / e.scale;
			field.scale = starting_scale * e.scale;

			world.refresh();

			e.stopPropagation();
			e.preventDefault();
		}
	}, false);
	window.addEventListener('gestureend', function(e) {
			e.stopPropagation();
			e.preventDefault();
	}, false);

	window.addEventListener('click', function(e) {
		if(e.metaKey) {
			var logo_coords = window2logo(e.offsetX, e.offsetY);

			world.current_turtle.gotoxy(logo_coords.x, logo_coords.y);

			e.stopPropagation();
			e.preventDefault();
		}
	}, false);

	window.addEventListener('wheel', function(e) {
		if(e.ctrlKey) {
			//arlog('wheel: ' + e.deltaY + ' X: ' + e.offsetX + ' Y: ' + e.offsetY);
			//arlog('w: ' + field.width + ' h: ' + field.height);
			//arlog('w: ' + (e.offsetX / field.width) + ' h: ' + (e.offsetY / field.height));
			//arlog('w: ' + field.width + ' h: ' + field.height);
			//arlog('ox: ' + field.origin_x + ' oy: ' + field.origin_y);
			//arlog('scale: ' + dpi_scaling);

			// in logo coordinate space, we are ???		
			var logo_coords = window2logo(e.offsetX, e.offsetY);
			
			var scale_factor = Math.pow(1.015, e.deltaY);

			if(!scale_factor)
				return;

			// we want that same point to
			// be in the center after the scaling 
			// positive scale factors mean a larger field
			var logo_center_x;
			var logo_center_y;

			if(last_logo_coords) {
				logo_center_x = last_logo_coords.x;
				logo_center_y = last_logo_coords.y;
			} else {
				logo_center_x = field.width / 2;
				logo_center_y = field.height / 2;
			}

			field.origin_x = ((field.origin_x + logo_center_x) * scale_factor) - logo_center_x;
			field.origin_y = ((field.origin_y - logo_center_y) * scale_factor) + logo_center_y;

			field.width *= scale_factor;
			field.height *= scale_factor;
			field.scale /= scale_factor;

			world.refresh();

			e.stopPropagation();
			e.preventDefault();
		}
	}, false);

	world.print = function() {
		var p_i;
		var p_c;
		var p_d;
		var p_context;
		var bb_ul_x=false, bb_ul_y=false, bb_lr_x=false, bb_lr_y=false,bb_set=false;
		var this_field;
		var mid;

		var x, y, l, t;
		for(y = 0 ; y < turtles.length ; y++) {
			t = turtles[y];
			for(x = 0 ; x < t.lines.length ; x++) {
				l = t.lines[x];
				if(l.kind == 'line') {
					l=l.coords;
					if(!bb_set) {
						if(l[0]<l[3]) {
							bb_ul_x=l[0];
							bb_lr_x=l[3];
						} else {
							bb_ul_x=l[3];
							bb_lr_x=l[0];
						}
						if(l[1]<l[4]) {
							bb_ul_y=l[4];
							bb_lr_y=l[1];
						} else {
							bb_ul_y=l[1];
							bb_lr_y=l[4];
						}
						bb_set = 1;
					} else {
						if( l[0] < bb_ul_x)	bb_ul_x=l[0];
						else if(l[0] > bb_lr_x) bb_lr_x=l[0];
						if( l[3] < bb_ul_x)	bb_ul_x=l[3];
						else if(l[3] > bb_lr_x) bb_lr_x=l[3];
						if( l[1] < bb_lr_y)	bb_lr_y=l[1];
						else if(l[1] > bb_ul_y) bb_ul_y=l[1];
						if( l[4] < bb_lr_y)	bb_lr_y=l[4];
						else if(l[4] > bb_ul_y) bb_ul_y=l[4];
					}
				}
			}
			t.show();
		}

		if(!bb_set) {
			alert('nothing to print');
			return;
		}

		var bb_width, bb_height;
		bb_width = bb_lr_x - bb_ul_x;
		bb_height = bb_ul_y - bb_lr_y;

		if (!bb_height) {
			alert('your bounding box is too small');
			return;
		}

		if( (bb_width / bb_height) > (8.5 / 11) ) {
			mid = bb_height / 2;
			bb_height = bb_width * 11 / 8.5;
			bb_lr_y = bb_lr_y + mid - bb_height/2;
			bb_ul_y = bb_lr_y + mid + bb_height/2;
		} else {
			mid = bb_width / 2;
			bb_width = bb_height * 8.5 / 11;
			bb_ul_x = bb_ul_x + mid - bb_width/2;
			bb_lr_x = bb_ul_x + mid + bb_width/2;
		}

		mid = bb_height / 2;
		bb_height *= 1.10;
		bb_lr_y = bb_lr_y + mid - bb_height/2;
		bb_ul_y = bb_lr_y + mid + bb_height/2;

		mid = bb_width / 2;
		bb_width *= 1.10;
		bb_ul_x = bb_ul_x + mid - bb_width/2;
		bb_lr_x = bb_ul_x + mid + bb_width/2;

		var scale;
		scale = (8.5 * 300) / bb_width;

		this_field = {
			width: bb_width,
			height: bb_height,
			origin_x: bb_ul_x * -1,
			origin_y: bb_ul_y,
			scale: scale
		};

		p_c = document.createElement('canvas');
		/*p_c.style.backgroundColor = '#88ff88';*/
		p_c.style.width = '8.5in';
		p_c.style.height = '11in';
		//p_c.style.position='absolute';
		//p_c.style.top='0px';
		//p_c.style.left='0px';
		p_c.width=this_field.width * scale;
		p_c.height=this_field.height * scale;

		p_context = p_c.getContext('2d');

		for(y = 0 ; y < turtles.length ; y++) {
			t = turtles[y];
			for(x = 0 ; x < t.lines.length ; x++) {
				l = t.lines[x];
				if(l.kind == 'line') {
					l=l.coords;
					drawlinexyz(this_field,p_context,l[0], l[1], l[2], l[3], l[4], l[5], l[6], l[7]);
				}
			}
			t.show();
		}

		p_d = document.createElement('div');
		p_d.style.breakAfter = 'always';
		p_d.style.pageBreakAfter = 'always';
		p_d.appendChild(p_c);

		p_i = document.createElement('iframe');
		document.body.appendChild(p_i);
		p_i.style.visibility = 'hidden';
		p_i.contentDocument.body.appendChild(p_d);

		for(y = 0 ; y < world.commands.length ; y++) {
			p_i.contentDocument.body.appendChild(document.createTextNode(world.commands[y]));
			p_i.contentDocument.body.appendChild(document.createElement('br'));
		}

		p_i.contentWindow.print();
		document.body.removeChild(p_i);
	};

	var queue = new Array;
	var queue_running = false;
	var queue_runner = function() {
		var q;
		q = queue[0];
		if(q[0])
			drawlinexyz.apply(this,q[0]);
		queue.shift();
		if(!queue.length) {
			queue_running = false;
			q[1]();
		}
		else
			setTimeout(queue_runner, 1);
	};
	var kickoff;
	kickoff = function() {
		if(!queue_running) {
			queue_running = true;
			setTimeout(queue_runner, 1);
		}
	};
	world.kickoff = kickoff;
	drawlinexyz = function(field, context, from_x, from_y, from_z, to_x, to_y, to_z, color, width, async) {
		if(async) {
			queue.push([ [field, context, from_x, from_y, from_z, to_x, to_y, to_z, color, width], async]);
			kickoff();
		} else {
			if(color) {
				context.strokeStyle = color;
			}
			if(width) {
				context.lineCap = "round";
				context.lineWidth = width;
			}
			context.beginPath();
			context.moveTo(field.scale * (field.origin_x + from_x), field.scale * (field.origin_y - from_y));
			context.lineTo(field.scale * (field.origin_x + to_x), field.scale * (field.origin_y - to_y));
			context.stroke();
		}
	};
	world.queue = queue;
	world.drawlinexyz = drawlinexyz;

	world.scale = function(factor) {
		dpi_scaling = dpi_scaling * factor;
		world.refresh();
	};

	return world;
};
	
var bootturtle = function(container_div) {
	var div;
	var c2;

	//field.width = window.innerWidth;
	//field.height = window.innerHeight - 100;
	field.width = container_div.clientWidth;
	field.height = container_div.clientHeight;
	field.origin_x = field.width / 2;
	field.origin_y = field.height / 2;
	field.scale = 1;

	div = document.createElement('div');

	// this is where we draw the lines
	c = document.createElement('canvas');
	/*c.style.backgroundColor = '#88ff88';*/
	c.style.width = field.width + 'px';
	c.style.height = field.height + 'px';
	c.width = field.width * dpi_scaling;
	c.height = field.height * dpi_scaling;
	c.style.position = 'absolute';
	c.style.top = '0px';
	c.style.left = '0px';

	// this is where we draw the turtle
	c2 = document.createElement('canvas');
	c2.style.width = field.width + 'px';
	c2.style.height = field.height + 'px';
	c2.width = field.width * dpi_scaling;
	c2.height = field.height * dpi_scaling;
	c2.style.position = 'absolute';
	c2.style.top = '0px';
	c2.style.left = '0px';
	context = c.getContext('2d');
	div.style.width=field.width + 'px';
	div.style.height=field.height + 'px';
	div.appendChild(c);
	div.appendChild(c2);
	context2 = c2.getContext('2d');
	resize_canvas = function() {
		field.width = container_div.clientWidth;
		field.height = container_div.clientHeight;

		c.style.width = field.width + 'px';
		c.style.height = field.height + 'px';
		c.width = field.width * dpi_scaling;
		c.height = field.height * dpi_scaling;

		c2.style.width = field.width + 'px';
		c2.style.height = field.height + 'px';
		c2.width = field.width * dpi_scaling;
		c2.height = field.height * dpi_scaling;

		div.style.width = field.width + 'px';
		div.style.height = field.height + 'px';
	};

	return div;
};

var mkturtle = function() {
	var turtle = new Object;

	turtle.lines = new Array;

	turtle.x = 0;
	turtle.y = 0;
	turtle.z = 0;

	turtle.penup = function() {
		turtle.pen = 0;
		turtle.gotoxyz(turtle.x, turtle.y, turtle.z);
	};
	turtle.pendown = function() {
		turtle.pen = 1;
		turtle.gotoxyz(turtle.x, turtle.y, turtle.z);
	};
	turtle.degrees = function() {
		turtle.degmode = 1;
	};
	turtle.radians = function() {
		turtle.degmode = 0;
	};
	turtle.xyzqueue=new Array;
	turtle.xyzqueue_runner = function() {
		var entry;
		var from_x, from_y, from_z;
		var to_x, to_y, to_z;
		var width;
		var color;
		var pen;
		var theta;
		var next;

		if(!turtle.xyzqueue.length) {
			//document.body.appendChild(document.createTextNode('(whoa)'));
			return;
		}
		entry = turtle.xyzqueue[0];
		turtle.xyzqueue.shift();

		if(entry.kind == 'line') {
			entry = entry.coords;
			from_x = entry[0];
			from_y = entry[1];
			from_z = entry[2];
			to_x = entry[3];
			to_y = entry[4];
			to_z = entry[5];
			color = entry[6];
			width = entry[7];
			pen = entry[8];
			theta = entry[9];

			next = function() {
				var ox, oy, oz, ot, op;
	
				// back up the turtle's position just to show
				ox = turtle.x;
				oy = turtle.y;
				oz = turtle.z;
				ot = turtle.theta;
				op = turtle.pen;
				turtle.x = to_x;
				turtle.y = to_y;
				turtle.z = to_z;
				turtle.theta = theta;
				turtle.pen = pen;
				turtle.show();
				turtle.x = ox;
				turtle.y = oy;
				turtle.z = oz;
				turtle.theta = ot;
				turtle.pen = op;

				if(turtle.xyzqueue.length) {
					setTimeout(turtle.xyzqueue_runner, timeout);
				} else {
					turtle.show();
					return;
				}
			};

			if(pen) {
				if(field.width && field.height)
					turtle.world.drawlinexyz(field, context,from_x, from_y, from_z, to_x, to_y, to_z, color, width, next);
			} else {
				next();
			}
		} else if(entry.kind == 'debug') {
			turtle.world.kickoff();

			next = function() {
				if(turtle.xyzqueue.length) {
					setTimeout(turtle.xyzqueue_runner, timeout);
				}
			};

			turtle.world.queue.push([ false, next]);
		} else if(entry.kind == 'proc') {
			entry.proc(function() {
				if(turtle.xyzqueue.length) {
					setTimeout(turtle.xyzqueue_runner, timeout);
				}
			});
		}
	};
	turtle.debug = function(msg) {
		turtle.xyzqueue.push({"kind": "debug", "msg": msg});
		setTimeout(turtle.xyzqueue_runner, timeout);
	};
	turtle.proc = function(proc) {
		if(turtle.xyzqueue.length) {
			turtle.xyzqueue.push({"kind": "proc", "proc": proc});
		} else {
			turtle.xyzqueue.push({"kind": "proc", "proc": proc});
			setTimeout(turtle.xyzqueue_runner, timeout);
		}
	};
	turtle.gotoxy = function(x, y) {
		return turtle.gotoxyz(x, y, turtle.z);
	}
	turtle.gotoxyz = function(x,y,z) {
		var nx, ny, nz;

		nx = turtle.x;
		ny = turtle.y;
		nz = turtle.z;

		if(turtle.xyzqueue.length) {
			if(turtle.pen)
				if((nx != x) || (ny != y) || (nz != z))
					turtle.lines.push({"kind": "line", "coords": [nx, ny, nz, x, y, z, turtle.color, turtle.width ]});

			turtle.xyzqueue.push({"kind": "line", "coords": [nx, ny, nz, x, y, z, turtle.color, turtle.width, turtle.pen, turtle.theta ]});
			turtle.x = x;
			turtle.y = y;
			turtle.z = z;
		} else {
			nx = turtle.x;
			ny = turtle.y;
			nz = turtle.z;

			if(turtle.pen)
				if((nx != x) || (ny != y) || (nz != z))
					turtle.lines.push({"kind": "line", "coords": [nx, ny, nz, x, y, z, turtle.color, turtle.width ]});

			turtle.xyzqueue.push({"kind": "line", "coords": [nx, ny, nz, x, y, z, turtle.color, turtle.width, turtle.pen, turtle.theta ]});

			turtle.x = x;
			turtle.y = y;
			turtle.z = z;
			setTimeout(turtle.xyzqueue_runner, timeout);
			//turtle.xyzqueue_runner();
		}
	};
	turtle.forward = function(d) {
		var x, y;
		x = turtle.x + d * Math.cos(turtle.theta);
		y = turtle.y + d * Math.sin(turtle.theta);
		turtle.gotoxyz(x, y, turtle.z);
	};
	turtle.back = function(d) {
		var x, y;
		x = turtle.x + -d * Math.cos(turtle.theta);
		y = turtle.y + -d * Math.sin(turtle.theta);
		turtle.gotoxyz(x, y, turtle.z);
	};
	turtle.lift = function(d) {
		turtle.gotoxyz(turtle.x, turtle.y, turtle.z + d);
	};
	turtle.drop = function(d) {
		turtle.gotoxyz(turtle.x, turtle.y, turtle.z - d);
	};
	turtle.show = function(d) {
		var x, y;
		if(!turtle.world) return;
		if(turtle.visible) {
			var c;

			context2.clearRect(0, 0, field.width * dpi_scaling, field.height * dpi_scaling);
			if(turtle.pen) {
				c = 'red';
			} else {
				c = 'blue';
			}
			x = turtle.x + (-15 * dpi_scaling / field.scale) * Math.cos(turtle.theta);
			y = turtle.y + (-15 * dpi_scaling / field.scale) * Math.sin(turtle.theta);
			turtle.world.drawlinexyz(field, context2, turtle.x, turtle.y, turtle.z, x, y, turtle.z, c, 1);
			x = turtle.x + (-10 * dpi_scaling / field.scale) * Math.cos(turtle.theta + 3.14159/12);
			y = turtle.y + (-10 * dpi_scaling / field.scale) * Math.sin(turtle.theta + 3.14159/12);
			turtle.world.drawlinexyz(field, context2, turtle.x, turtle.y, turtle.z, x, y, turtle.z, c, 1);
			x = turtle.x + (-10 * dpi_scaling / field.scale) * Math.cos(turtle.theta - 3.14159/12);
			y = turtle.y + (-10 * dpi_scaling / field.scale) * Math.sin(turtle.theta - 3.14159/12);
			turtle.world.drawlinexyz(field, context2,turtle.x, turtle.y, turtle.z, x, y, turtle.z, c, 1);

			if(turtle.grid) {
				var grid = turtle.grid;
				var cos = Math.cos(turtle.theta);
				var sin = Math.sin(turtle.theta);

				x = turtle.x + grid * Math.cos(turtle.theta);
				y = turtle.y + grid * Math.sin(turtle.theta);
				turtle.world.drawlinexyz(field, context2,turtle.x, turtle.y, turtle.z, x, y, turtle.z, 'green', 1);
				x = turtle.x + grid * Math.cos(turtle.theta + 3.14159/2);
				y = turtle.y + grid * Math.sin(turtle.theta + 3.14159/2);
				turtle.world.drawlinexyz(field, context2,turtle.x, turtle.y, turtle.z, x, y, turtle.z, 'green', 1);
				x = turtle.x + -grid * Math.cos(turtle.theta);
				y = turtle.y + -grid * Math.sin(turtle.theta);
				turtle.world.drawlinexyz(field, context2,turtle.x, turtle.y, turtle.z, x, y, turtle.z, 'green', 1);
				x = turtle.x + -grid * Math.cos(turtle.theta + 3.14159/2);
				y = turtle.y + -grid * Math.sin(turtle.theta + 3.14159/2);
				turtle.world.drawlinexyz(field, context2,turtle.x, turtle.y, turtle.z, x, y, turtle.z, 'green', 1);
			}
		}
	};
	turtle.clear = function(d) {
		if(field.width && field.height)
			context.clearRect(0, 0, field.width, field.height);
	};
	turtle.hide = function(d) {
		var x, y;
		context2.clearRect(0, 0, field.width, field.height);
	};
	turtle.turn = function(theta) {
		if(turtle.degmode) {
			theta=theta*2*3.14159/360;
		}
		turtle.theta += theta;
		turtle.gotoxyz(turtle.x, turtle.y, turtle.z);
	};
	turtle.left = turtle.turn;
	turtle.right = function(theta) {
		turtle.turn(-theta);
	};
	turtle.home = function() {
		var p;

		turtle.theta = 0;
		turtle.gotoxyz(turtle.x, turtle.y, turtle.z);
		
		turtle.gotoxyz(0,0,0);
	};
	turtle.reset = function() {
		turtle.pen = 1;
		turtle.grid = 0;
		turtle.color = 'black';
		turtle.width = 1;
		turtle.degmode = 1;
		turtle.visible = 1;
		turtle.home();
		turtle.clear();
		turtle.pendown();
		//turtle.show();
	};

	turtle.reset();

	return turtle;
};
