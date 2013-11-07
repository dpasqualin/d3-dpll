/*
The MIT License

Copyright (c) 2010 Mariano M. Chouza

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

/*
Uses DPLL as described in  Cook and Mitchell "Finding Hard Instances of the
Satisfiability Problem: A Survey" p. 3
*/

"use strict";

var dpll = (function () {

	function simplifyClause(c, a) {
		var nc, i;
		nc = [];
		for (i = 0; i < c.length; i++) {
			if (c[i] in a) {
				return null;
			} else if (!(-c[i] in a)) {
				nc.push(c[i]);
			}
		}
		return nc;
	}

	function applyAssignment(f, a) {
		var nf, i, nc;
		nf = [];
		for (i = 0; i < f.length; i++) {
			nc = simplifyClause(f[i], a);
			if (nc !== null) {
				nf.push(nc);
			}
		}
		return nf;
	}

	function cloneAssignment(a) {
		var na, v;
		na = {};
		for (v in a) {
			na[v] = true;
		}
		return na;
	}

	function recDPLL(f, a) {
		var i, na, v, ret;
		f = applyAssignment(f, a);
		if (f.length === 0) {
			return [true, a];
		}
		for (i = 0; i < f.length; i++) {
			if (f[i].length === 0) {
				return [false, {}];
			} else if (f[i].length === 1) {
				na = cloneAssignment(a);
				na[f[i][0]] = true;
				return recDPLL(f, na);
			}
		}
		na = cloneAssignment(a);
		na[f[0][0]] = true;
		ret = recDPLL(f, na);
		if (ret[0]) {
			return ret;
		}
		delete na[f[0][0]];
		na[-f[0][0]] = true;
		return recDPLL(f, na);
	}

	return function (f, a) {
		if (!a) {
			a = {};
		}
		return recDPLL(f, a);
	};
}());
