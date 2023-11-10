
assemble = function(new_vml, start, text_vml) {
	// assemble needs exclusive access to the tape.

	// concatenate the data vml with the text vml into new_vml and record the label addresses	
	var label_dict = {};

	var label_extractor = function(l) {
		var x;

		for(x = 0 ; x < l.length ; x++) {
			if(l[x].kind == "label") {
				if(label_dict[l[x].val]) {
					return {
						kind: "error",
						msg: 'duplicate label ' + l[x].val + ' at tape index ' + x + '. already recorded at ' + label_dict[l[x].val]
					};
				}
				label_dict[l[x].val] = new_vml.length;
			} else if(l[x].kind == "block") {
				label_extractor(l[x].val);
			} else {
				new_vml.push(l[x]);
			}
		}
	};

	label_extractor(text_vml);

	var x;
	// rewrite lrefs into addresses
	for(x = start ; x < new_vml.length ; x++) {
		if(new_vml[x].kind == 'lref') {
			if(label_dict[new_vml[x].val]) {
				new_vml[x].kind = "addr";
				new_vml[x].val = label_dict[new_vml[x].val];
			} else {
				return {
					kind: "error",
					msg: "found an lref for an unknown label"
				};
			}
		} else if(new_vml[x].kind == 'op') {
			if(new_vml[x].arg1_seg == "labs") {
				new_vml[x].arg1_seg = "abs";
				new_vml[x].arg1 = label_dict[new_vml[x].arg1];
			} else if(new_vml[x].arg1_seg == "lrel") {
				new_vml[x].arg1_seg = "pc";
				new_vml[x].arg1 = label_dict[new_vml[x].arg1] - x;
			}
			if(new_vml[x].arg2_seg == "labs") {
				new_vml[x].arg2_seg = "abs";
				new_vml[x].arg2 = label_dict[new_vml[x].arg2];
			} else if(new_vml[x].arg2_seg == "lrel") {
				new_vml[x].arg2_seg = "pc";
				new_vml[x].arg2 = label_dict[new_vml[x].arg2] - x;
			}
		} else if(new_vml[x].kind == 'frame') {
			if(typeof(new_vml[x].size) == "object") {
				if(new_vml[x].size.seg != "lextent")
					continue;
				new_vml[x].size = label_dict[new_vml[x].size.val] - (x + 1);
			}
		}
	}

	return label_dict;
};
