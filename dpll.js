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

var Dpll = function(graph) {
    this._s_tree = {
        'name': 'Root',
        'children': []
    };
    this._graph = graph;
};

Dpll.prototype._simplifyClause = function(c, a) {
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
};

Dpll.prototype._applyAssignment = function(f, a) {
		var nf, i, nc;
		nf = [];
		for (i = 0; i < f.length; i++) {
			nc = this._simplifyClause(f[i], a);
			if (nc !== null) {
				nf.push(nc);
			}
		}
		return nf;
};

Dpll.prototype._cloneAssignment = function(a) {
		var na, v;
		na = {};
		for (v in a) {
			na[v] = true;
		}
		return na;
};

Dpll.prototype._updateTree = function(a, na) {
    var s_tree_children = this._s_tree.children;
    console.log(na,this._s_tree);
    if (na === true || na === false) return;
    for (var v in na) {
        var found = false;
        for (var i=0; i<s_tree_children.length; i++) {
            var name = String(s_tree_children[i].name);
            console.log('compare',name,v);
            if (name === v) {
                console.log('found',v);
                s_tree_children = s_tree_children[i].children;
                found = true;
                break;
            }
        }
        if (found) {
            continue;
        }
        console.log('add',v);
        s_tree_children.push({
            'name': String(v),
            'children': []
        });

        // Necessary to make the graph looks good
        console.log('add',String(-v));
        s_tree_children.push({
            'name': String(-v),
            'children': []
        });
        s_tree_children = s_tree_children[s_tree_children.length-2].children;
    }
    console.log('----------');
    this._updateGraph();
};

Dpll.prototype._updateGraph = function () {
    if (!this._graph) {
        return;
    }

    this._graph.draw(this._s_tree);
}

Dpll.prototype._recDPLL = function(f, a) {
		var i, na, v, ret;
		f = this._applyAssignment(f, a);
		if (f.length === 0) {
            this._updateTree(a, true);
			return [true, a];
		}
		for (i = 0; i < f.length; i++) {
			if (f[i].length === 0) {
                this._updateTree(a, false);
				return [false, {}];
			} else if (f[i].length === 1) {
				na = this._cloneAssignment(a);
				na[f[i][0]] = true;
                this._updateTree(a, na);
				return this._recDPLL(f, na);
			}
		}
		na = this._cloneAssignment(a);
		na[f[0][0]] = true;
        this._updateTree(a, na);
		ret = this._recDPLL(f, na);
		if (ret[0]) {
            this._updateTree(a, ret[0]);
			return ret;
		}
		delete na[f[0][0]];
		na[-f[0][0]] = true;
        this._updateTree(a, na);
		return this._recDPLL(f, na);
}

Dpll.prototype.getClauses = function(txt, varsDict) {
    var clausesLines = $('#problemTxt').val().split('\n');
    var clauses = [];
    var varCounter = 1;
    var revVarsDict = {}; // var name -> var num
    for (var i = 0; i < clausesLines.length; i++) {
        if (!clausesLines[i]) {
            continue;
        }
        var newClause = [];
        var clauseFields = clausesLines[i].split(' ');
        for (var j = 0; j < clauseFields.length; j++) {
            var neg = false;
            if (!clauseFields[j]) {
                continue;
            }
            if (clauseFields[j][0] === '-') {
                clauseFields[j] = clauseFields[j].substring(1);
                neg = true;
            }
            if (!(clauseFields[j] in revVarsDict)) {
                revVarsDict[clauseFields[j]] = varCounter;
                varsDict[varCounter] = clauseFields[j];
                varCounter++;
            }
            if (neg) {
                newClause.push(-revVarsDict[clauseFields[j]]);
            } else {
                newClause.push(revVarsDict[clauseFields[j]]);
            }
        }
        if (newClause.length !== 0) {
            clauses.push(newClause);
        }
    }
    return clauses;
};

Dpll.prototype.getPrintableClauses = function(clauses, varsDict) {
    var clausesLines = [];
    for (var i = 0; i < clauses.length; i++) {
        var clauseFields = [];
        for (var j = 0; j < clauses[i].length; j++) {
            if (clauses[i][j] < 0) {
                clauseFields.push('-' + varsDict[-clauses[i][j]]);
            } else {
                clauseFields.push(varsDict[clauses[i][j]]);
            }
        }
        clausesLines.push(clauseFields.join(' '));
    }
    return clausesLines.join('\n');
};

Dpll.prototype.getPrintableSol = function(sol, varsDict) {
    if (!sol[0]) {
        return 'UNSATISFIABLE';
    }
    var txt = 'SATISFIABLE\n';
    for (var v in sol[1]) {
        if (v < 0) {
            txt += '-' + varsDict[-v];
        } else {
            txt += varsDict[v];
        }
        txt += ' ';
    }
    return txt;
};

/* This is the function that must be call in order to solve a formula */
Dpll.prototype.solve = function(f, a) {
    if (!a) {
        a = {};
    }
    return this._recDPLL(f, a);
}
