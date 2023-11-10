/*
 * generate an interesting, legal arvm program
 */

mkprog = function() {
	// the starting deferred pointer should be 1
	return [
		{kind: "op", val: "alice"}, // 0
			// ^ trigger a context switch
		{kind: "deferred", pc: 2, fp: 25, r: 0, blocked: 3, completed: 0, next: 5}, // 1
			// ^ parked thread 1. this thread cannot be restarted without restarting thread 2
		{kind: "debug", msg: "yay! restarted context 1!"}, // 2
		{kind: "blank"}, // 3
			// ^ this is the piece of tape that thread 1 is blocked on
		{kind: "op", val: "alice" }, // 4
			// ^ and end this thread.
		{kind: "deferred", pc: 10, fp: 6, r: 0, blocked: 7, completed: 0, next: 0}, // 5
			// ^ parked thread 2. this thread can be restarted right away
		{kind: "frame", size: "3"}, // 6
			// ^ the frame for thread 2
			{kind: "lit", val: 6 }, // 7
			{kind: "blank"}, // 8
			{kind: "blank"}, // 9
		{kind: "debug", msg: "yay! restarted context 2!"}, // 10
		{kind: "sz", val: 20}, // 11
		{kind: "op", val: "feed", arg1_seg: "fp", arg1: 1, arg2_seg: "abs", arg2: 11}, // 12
		// ^ feed abs:11 (20) spaces of tape and write the start into fp:1 (abs:8)
		{kind: "op", val: "set", arg1_seg: "abs", arg1: 3, arg2_seg: "abs", arg2: 14}, // 13
		// ^ set abs:3 to abs:14 (125). this will allow thread 1 to unblock
		{kind: "lit", val: 125 }, // 14
		{kind: "op", val: "fork", arg1_seg: "fp", arg1: 1, arg2_seg: "abs", arg2: 17}, // 15
		// ^ create a new thread with frame pointer stored at fp:1 and pc stored at abs:17
		{kind: "op", val: "alice"}, // 16
		// ^ halt this thread
		{kind: "addr", val: 18}, // 17
		{kind: "debug", msg: "yay! thread target!"}, // 18
		{kind: "op", val: "set", arg1_seg: "fp", arg1: 6, arg2_seg: "abs", arg2: 14}, // 19
		{kind: "op", val: "alice"}, // 20
		{kind: "op", val: "alice"}, // 21
		{kind: "op", val: "alice"}, // 22
		{kind: "op", val: "alice"}, // 23
		{kind: "op", val: "alice"}, // 24
		{kind: "frame", size: "3"}, // 25
			{kind: "blank"}, // 26
			{kind: "blank"}, // 27
			{kind: "blank"}, // 28
	];
};
