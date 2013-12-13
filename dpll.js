"use strict";

var Dpll = function(graph, config) {
    this._graph = graph;
    this._next_step = true;
    this._finished = false;
    this._is_sat = false;
    this._printed = false; // FIX nextStep logic and discard this var
    this._config = config || {
        step_by_step: false
    };
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

Dpll.prototype._updateGraph = function () {
    if (!this._graph) {
        return;
    }
    var root = this._tree_root;

    this._graph.draw(root);
}

/* Add a node named "name" to node "node" */
Dpll.prototype._addTreeNode = function(assignment, formula, node, name) {
    if (!node.children)
        node.children = [];

    /* Ensure the current assignment has been applied to the formula */
    var new_f = this._applyAssignment(formula, assignment)

    node.children.push({
        'name': String(name),
        'children': [],
        'formula': this.getPrintableFormula(new_f)
    });
}

Dpll.prototype._recDPLL = function(f, a, t) {
    var i, na, v, ret, cur_a;
    f = this._applyAssignment(f, a);
    if (f.length === 0) {
        this._addTreeNode(a, f, t, 'SAT');
        this._state = [true, a, t];
        return;
    }
    for (i = 0; i < f.length; i++) {
        if (f[i].length === 0) {
            this._addTreeNode(a, f, t, 'UNSAT');
            this._state = [false, a, t, null];
            return;
        } else if (f[i].length === 1) {
            na = this._cloneAssignment(a);
            cur_a = f[i][0];
            na[cur_a] = true;

            this._addTreeNode(na, f, t, cur_a);
            /* At this point there is only one literal not evaluated, so
             * its complementary will be unsat */
            this._addTreeNode(na, f, t, -cur_a);
            this._addTreeNode(na, f, t.children[1], 'UNSAT');
            this._state = [f, na, t.children[0], cur_a];
            return;
        }
    }
    na = this._cloneAssignment(a);
    cur_a = f[0][0];
    na[cur_a] = true;
    this._addTreeNode(na, f, t, cur_a);
    this._addTreeNode(na, f, t, -cur_a);

    this._state = [f, na, t.children[0], cur_a];
}

Dpll.prototype._printSatLinks = function(node) {
    if (node === undefined) {
        this._updateGraph();
        return;
    }
    node.sat_path = true;
    this._printSatLinks(node.parent);
};

Dpll.prototype._backtrack = function() {
    var tree = this._state[2];

    for (var i=0; tree.children && i<tree.children.length; i++) {
        var grandson = tree.children[i];
        if (grandson.name !== 'UNSAT' && !grandson.children) {

            /* Set current assignment */
            var cur_a = parseInt(grandson.name);
            this._state[3] = cur_a;

            /* Set new assignment.
             * Delete current assignment complement and all assignments made
             * after it */

            /* TODO: put the assignment in an array instead of an object.
             * With an object the only way we can assign a value an still
             * have a backtrack is with the lexicograph order assignment. */
            var new_a = [];
            for (var a in this._state[i]) {
                new_a.push(parseInt(a));
            }
            for (var a=0; a<new_a.length; a++) {
                if (Math.abs(new_a[a]) >= Math.abs(cur_a)) {
                    delete this._state[1][String(new_a[a])];
                }
            }

            this._state[1][cur_a] = true;

            /* Set new tree root node */
            this._state[2] = grandson;

            /* Restore original formula */
            this._state[0] = this._copyFormula(this._formula);

            return;
        }
    }

    /* Adjust recursion parameter */
    this._state[2] = tree.parent;
    this._backtrack();
}

Dpll.prototype.nextStep = function() {

    var formula = this._state[0],
        assignment = this._state[1],
        tree = this._state[2],
        cur_a = this._state[3],
        tree_root = this._tree_root;

    if (this._hasFinished(tree_root)) {
        if (this._is_sat && !this._printed) {
            this._printed = true;
            this._printSatLinks(tree.children[0]);
        }
        return [ true, formula, this._state ];
    }

    if (formula === false) {

        /* At this point cur_a will not be known, we have to perform a
         * backtrack locking for a branch not searched yet */

        this._backtrack();

        /* Reload state info */
        formula = this._state[0];
        assignment = this._state[1];
        tree = this._state[2];

        this._recDPLL(formula, assignment, tree);
    } else {
        this._recDPLL(formula, assignment, tree);
    }
    this._updateGraph();
    return [ false, undefined, this._state ];
}

Dpll.prototype._copyFormula = function(formula) {
    var f = [];
    for (var i=0; i<formula.length; i++) {
        var c = [];
        for (var j=0; j<formula[i].length; j++) {
            c.push(formula[i][j]);
        }
        f.push(c);
    }
    return f;
};

/* This is the function that must be call in order to solve a formula */
Dpll.prototype.solve = function(formula, assignment, config) {

    var tree = {
        'name': 'Root',
        'children': [],
        'formula': this.getPrintableFormula(formula)
    };

    /* Save a copy of the formula for backtracking purpose */

    this._formula = this._copyFormula(formula);
    this._tree_root = tree;
    this._finished = false;
    this._is_sat = false;
    this._printed = false;

    if (config) {
        for (var c in config) {
            this._config[c] = config[c];
        }
    }

    this._recDPLL(formula, assignment, tree);
    this._updateGraph();
    if (!this._config.step_by_step) {
        while (this.nextStep()[0] === false) {
            // do nothing
        }
        return this.nextStep();
    } else {
        return [false, false, {}];
    }

}

Dpll.prototype.getClauses = function(txt, varsDict) {
    var clausesLines = txt.split('\n');
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

Dpll.prototype.getPrintableFormula = function(formula) {
    var clauses = [];
    for (var c=0; c<formula.length; c++) {
        clauses.push(formula[c].join(" "));
    }

    return clauses.join("</br>");
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

/* It has finished if every node in the tree has an UNSAT leaf */
Dpll.prototype._hasFinished = function(tree) {
    if (this._finished) return true;
    var c = tree.children;

    if (c !== undefined && c.length === 1) {
        if (c[0].name === 'UNSAT') {
            return true;
        } else if (c[0].name === 'SAT') {
            this._finished = true;
            this._is_sat = true;
            return true;
        }
    } else if (c === undefined || c.length === 0) {
        return false;
    }

    return this._hasFinished(tree.children[0]) && this._hasFinished(tree.children[1]);
}


