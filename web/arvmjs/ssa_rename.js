findframes = function(vml) {
	var x;
	var frames = [];
	var inframe = 0;
	var framestart = 0;
	var frameend = false;

	for(x = 0 ; x < vml.length ; x++) {
		if(inframe) {
			if(vml[x].kind == "frame") {
				arlog("nested frames");
				return false;
			}
			if(frameend(x)) {
				frames.push([framestart, x]);
				inframe = 0;
			}
		} else if(vml[x].kind == "frame") {
			framestart = x;
			framesize = vml[x].size;
			if(typeof(framesize) == "number") {
				if(framesize == 0)
					continue;
				if((x + framesize) >= vml.length) {
					arlog("frame past end of tape");
					return false;
				}
				inframe = 1;
				frameend = function(x) {
					if((x > vml.length)
					   || (x >= framestart + framesize))
						return 1;
					else
						return 0;
				};
			} else {
				inframe = 1;
				frameend = function(x) {
					if((x < vml.length)
					   && (vml[x].kind == "label")
					   && (vml[x].val == framesize.val))
						return 1;
					else
						return 0;
				};
			}
		}
	}

	return frames;
};

has_ssa = function(vmlent) {
	if(vmlent.kind == "op") {
		if(vmlent.val == "set") {
			if(vmlent.arg1_seg == "ssa")
				return true;
		}
		if(typeof(vmlent.arg1_seg) == "number")
			return true;
		if(typeof(vmlent.arg2_seg) == "number")
			return true;
	}

	return 0;
};

regrename = function(vml) {
	var x;
	var edits = [];
	var frames;

	frames = findframes(vml);
	if(!frames) {
		arlog("unable to find frames");
		return false;
	}

	var path_length = function(p) {
		if(p.kind == "caddr")
			return 1;
		return 1 + path_length(p[1]);
	};

	var paths_equal = function(a, b) {
		if((a.kind == "caddr") && (b.kind == "caddr")) {
			if((a.seg == b.seg) && (a.val == b.val))
				return true;
			else
				return false;
		} else if(a.kind == "caddr")
			return false;
		else if(b.kind == "caddr")
			return false;
		else if(a[0] != b[0])
			return false;
		else
			return paths_equal(a[1], b[1]);
	};

	var compare_paths = function(pa, pb) {
		if(pa.kind == "caddr" && pb.kind == "caddr") {
			if(pa.seg == pb.seg) {
				if(pa.val < pb.val)
					return -1;
				else if(pa.val > pb.val)
					return 1;
				else
					return 0;
			} else if(pa.val < pb.val)
				return -1;
			else if(pa.val > pb.val)
				return 1;
			else
				return 0;
		} else if(pa.kind == "caddr")
			return -1;
		else if(pb.kind == "caddr")
			return 1;
		else
			return compare_paths(pa[1], pb[1]);
	};

	var rename_frame = function(from, to) {
		var ssa_reg;
		var ssa_regs = [];
		var ssa_regs_by_reg = {};
		var x;

		//arlog('renaming frame ' + from + ':' + to);

		for(x = from ; x <= to ; x++) {
			if(vml[x].kind == "op" && vml[x].val == "set") {
				if(vml[x].arg1_seg == "ssa") {
					ssa_reg = {reg: vml[x].arg1, born: x};
					ssa_regs_by_reg[vml[x].arg1] = ssa_reg;
					ssa_regs.push(ssa_reg);
					if(typeof(vml[x].arg2_seg) == "number") {
						ssa_reg.path = [
							vml[x].arg2 ,
							ssa_regs_by_reg[vml[x].arg2_seg].path
						]
					} else {
						ssa_reg.path = {
							kind: "caddr",
							seg: vml[x].arg2_seg,
							val: vml[x].arg2
						};
					}
				}
			}
		}

		if(ssa_regs.length == 0)
			return 0;

		// sorting is step 1 in deduping
		sorted_ssa_regs = ssa_regs.sort(function(a, b) {
			var r;
			if(path_length(a.path) < path_length(b.path))
				return -1;
			else if(path_length(a.path) > path_length(b.path))
				return 1;
			else {
				r = compare_paths(a.path, b.path);
				if(!r) {
					if(a.born < b.born)
						return -1;
					else if(a.born > b.born)
						return 1;
					else
						return 0;
				} else
					return r;
			}
		});

		//arlog('sorted regs: ' + JSON.stringify(sorted_ssa_regs));

		var cursor_idx = 0;
		var cursor = sorted_ssa_regs[cursor_idx];
		var replacements = [];
		for(x = 0 ; x < sorted_ssa_regs.length ; x++) {
			replacements.push(-1);
		}
		for(x = 1 ; x < sorted_ssa_regs.length ; x++) {
			if(paths_equal(cursor.path, sorted_ssa_regs[x].path)) {
				replacements[sorted_ssa_regs[x].reg] = cursor.reg;
			} else {
				cursor_idx = x;
				cursor = sorted_ssa_regs[cursor_idx];
			}
		}

		var net_change = 0;

		for(x = from ; x <= to + net_change ; x++) {
			if(vml[x].kind == "op") {
				if(vml[x].val == "set") {
					if(vml[x].arg1_seg == "ssa") {
						if(replacements[vml[x].arg1] >= 0) {
							net_change--;
							vml.splice(x,1);
							x--;
						}
					}
				}
				if(typeof(vml[x].arg1_seg) == "number") {
					if(replacements[vml[x].arg1_seg] >= 0) {
						vml[x].arg1_seg = replacements[vml[x].arg1_seg];
					}
				}	
				if(typeof(vml[x].arg2_seg) == "number") {
					if(replacements[vml[x].arg2_seg] >= 0) {
						vml[x].arg2_seg = replacements[vml[x].arg2_seg];
					}
				}	
			}
		}

		return net_change;
	}

	var x;
	var change_cursor = 0;
	var r;
	for(x = 0 ; x < frames.length ; x++) {
		r = rename_frame(frames[x][0] + change_cursor, frames[x][1] + change_cursor);
		if(typeof(r) != "number") {
			return false;
		}
		change_cursor += r;
	}

	return true;
};

showmatrix = function(matrix) {
	var s = "";
	var z;
	var y;
	for(y = 0 ; y < matrix.length ; y++) {
		s = "";
		var d = 0;
		for(z = 0 ; z < matrix[y].length ; z++) {
			if(matrix[y][z][0]) {
				s += ( " ^" + matrix[y][z][1] );
			} else {
				s += ( " " + matrix[y][z][1] );
			}
		}
		arlog(y + ': (' + matrix[y].idx + ') ' + s);
	}
}

regname = function(vml) {
	var frames = [];
	var x; 

	if(!regrename(vml)) {
		arlog("unable to rename the ssa registers");
		return false;
	}

	frames = findframes(vml);
	if(frames.length == 0) {
		arlog("unable to find frames");
		return false;
	}

	// we splice rows in, so work from back to front
	// to not upset the frame indicies
	for(x = frames.length - 1 ; x >= 0 ; x--) {
		//arlog('examining a frame at ' + frames[x][0]);
		var ssa_reg;
		var ssa_regs = [];
			// ssa_regs have the form {
			//	reg: src_reg,
			//	idx: ssa_reg,
			//	path: [ ... ]
			// }
		var ssa_lines = 0;
		var y;
		var matrix = [];
		var bysrc = {};
		var frame;

		// matrix has one row per vml line with ssa
		// one column per ssa variable
		// each entry of the form [ needs_init, reg ]

		for(y = frames[x][0] ; y <= frames[x][1] ; y++) {

			//arlog('examining frame entry ' + y + ' ' + JSON.stringify(vml[y]));
			if(has_ssa(vml[y])) {
				//showrange(vml, y, y+1);
				ssa_lines++;
				var row = [];
				row.idx = y;
				matrix.push(row);
			}

			if((vml[y].kind == "op") && (vml[y].val == "set")) {
				if(vml[y].arg1_seg == "ssa") {
					ssa_reg = {reg: vml[y].arg1, idx: ssa_regs.length};
					if(typeof(vml[y].arg2_seg) == "number") {
						ssa_reg.path = [
							vml[y].arg2 ,
							bysrc[vml[y].arg2_seg].path
						]
					} else {
						ssa_reg.path = {
							kind: "caddr",
							seg: vml[y].arg2_seg,
							val: vml[y].arg2
						};
					}
					bysrc[vml[y].arg1] = ssa_reg;
					ssa_regs.push(ssa_reg);
				}
			}
		}

		if(!ssa_regs.length) continue;

		// initialize an empty register matrix
		var foo;
		for(foo = 0 ; foo < matrix.length ; foo++) {
			for(y = 0 ; y < ssa_regs.length ; y++) {
				matrix[foo].push([0, 0]);
			}
		}
		var z = 0;
		for(y = frames[x][0] ; y <= frames[x][1] ; y++) {
			if((vml[y].kind == "op") && (vml[y].val == "set")) {
				if(vml[y].arg1_seg == "ssa") {
					matrix[z][bysrc[vml[y].arg1].idx][1] = 1;
				}
			}
			if(typeof(vml[y].arg1_seg) == "number") {
				matrix[z][bysrc[vml[y].arg1_seg].idx][1] = 1;
			}
			if(typeof(vml[y].arg2_seg) == "number") {
				matrix[z][bysrc[vml[y].arg2_seg].idx][1] = 1;
			}
			if(has_ssa(vml[y])) z++;
		}

		// working back, mark the expiration of each variable
		var dead_cursor = [];
		for(y = 0 ; y < matrix[0].length ; y++) {
			dead_cursor.push(1);
		}

		for(y = matrix.length - 1 ; y >= 0 ; y--) {
			for(z = 0 ; z < dead_cursor.length ; z++) {
				if(dead_cursor[z]) {
					if(matrix[y][z][1] == 1) {
						dead_cursor[z] = 0;
					} else {
						matrix[y][z][1] = 'x';
					}
				}
			}
		}

		// now run the allocator
		var free_regs = [ "r1", "r2" ];
		// the alloc map preserves register allocations
		// across matrix rows that do not use the var
		var alloc_map = [];
		for(z = 0 ; z < matrix[0].length ; z++)
			alloc_map.push(0);
		for(y = 0 ; y < matrix.length ; y++) {
			// release expired allocations
			for(z = 0 ; z < matrix[y].length ; z++) {
				if(alloc_map[z] && (matrix[y][z][1] == 'x')) {
					free_regs.push(matrix[y-1][z][1]);
					alloc_map[z] = 0;
				}
			}
			for(z = 0 ; z < matrix[y].length ; z++) {
				if(matrix[y][z][1] == 1) {
					if(alloc_map[z]) {
						matrix[y][z][1] = alloc_map[z];
					} else if(free_regs.length) {
						alloc_map[z] = free_regs.shift();
						matrix[y][z][1] = alloc_map[z];
					} else {
						// else we have to invalidate.
						// we should check in order of restoration cost.
						var z2;
						for(z2 = 0 ; z2 < alloc_map.length ; z2++) {
							if(alloc_map[z2] && !matrix[y][z2][1]) {
								alloc_map[z] = alloc_map[z2];
								matrix[y][z][1] = alloc_map[z];
								matrix[y][z2][1] = 'I';
								alloc_map[z2] = 0;
								break;
							}
						}
					}
				}
			}
		}

		// now fix the needs-init portion
		var restore_map = [];
		for(z = 0 ; z < matrix[0].length ; z++) {
			restore_map.push(0);
		}
		for(y = 1 ; y < matrix.length ; y++) {
			for(z = 0 ; z < matrix[y].length ; z++) {
				if(matrix[y][z][1] == 'I') {
					restore_map[z] = 1;
				} else if(matrix[y][z][1] == 'x') {
					// do nothing
				} else if(matrix[y][z][1]) {
					if(restore_map[z]) {
						matrix[y][z][0] = 1;
						restore_map[z] = 0;
					}
				}
			}
		}

		//arlog('after need-init');
		//showmatrix(matrix);

		// now fix up the text working backwards (so fixups don't
		// throw us off)
		for(y = matrix.length - 1 ; y >= 0 ; y--) {
			var vment;
			vment = vml[matrix[y].idx];
			if(vment.kind == "op") {
				if(vment.val == "set" && vment.arg1_seg == "ssa") {
					vment.arg1_seg = "reg";
					vment.arg1 = matrix[y][bysrc[vment.arg1].idx][1];
				}
				if(typeof(vment.arg1_seg) == "number") {
					var sreg = bysrc[vment.arg1_seg].idx;
					if(matrix[y][sreg][0]) {
						var path_cursor = ssa_regs[sreg].path;
						while(path_cursor) {
							if(path_cursor.kind == "caddr") {
								vml.splice(matrix[y].idx, 0, {
									kind: "op",
									val: "set",
									arg1_seg: "reg",
									arg1: matrix[y][sreg][1],
									arg2_seg: path_cursor.seg,
									arg2: path_cursor.val,
								});
								path_cursor = false;
							} else {
								vml.splice(matrix[y].idx, 0, {
									kind: "op",
									val: "set",
									arg1_seg: "reg",
									arg1: matrix[y][sreg][1],
									arg2_seg: matrix[y][sreg][1],
									arg2: path_cursor[0]
								});
								path_cursor = path_cursor[1];
							}
						}
					}
					vment.arg1_seg = matrix[y][sreg][1];
				}
				if(typeof(vment.arg2_seg) == "number") {
					var sreg = bysrc[vment.arg2_seg].idx;
					if(matrix[y][sreg][0]) {
						var path_cursor = ssa_regs[sreg].path;
						while(path_cursor) {
							if(path_cursor.kind == "caddr") {
								vml.splice(matrix[y].idx, 0, {
									kind: "op",
									val: "set",
									arg1_seg: "reg",
									arg1: matrix[y][sreg][1],
									arg2_seg: path_cursor.seg,
									arg2: path_cursor.val,
								});
								path_cursor = false;
							} else {
								vml.splice(matrix[y].idx, 0, {
									kind: "op",
									val: "set",
									arg1_seg: "reg",
									arg1: matrix[y][sreg][1],
									arg2_seg: matrix[y][sreg][1],
									arg2: path_cursor[0]
								});
								path_cursor = path_cursor[1];
							}
						}
					}
					vment.arg2_seg = matrix[y][sreg][1];
				}
			}
		}
	}

	return true;
}
