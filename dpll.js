"use strict";

var Dpll = function(graph, config) {
    this._graph = graph;
    this._next_step = true;
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

    // FIXME: The best way would be to add some transitions between graph
    // updates instead of cleaning it all on every change
    this._graph.clean();
    this._graph.draw(root);
}

/* Add a node named "name" to node "node" */
Dpll.prototype._addTreeNode = function(node, name) {
    if (!node.children)
        node.children = [];

    node.children.push({
        'name': String(name),
        'children': []
    });
}

Dpll.prototype.nextStep = function() {
    this._next_step = true;
}

Dpll.prototype._recDPLL = function(f, a, t) {
    var i, na, v, ret, cur_a;
    f = this._applyAssignment(f, a, t);
    if (f.length === 0) {
        this._addTreeNode(t, 'SAT');
        this._state = [true, a, t];
        return;
    }
    for (i = 0; i < f.length; i++) {
        if (f[i].length === 0) {
            this._addTreeNode(t, 'UNSAT');
            this._state = [false, {}, t, null];
            return;
        } else if (f[i].length === 1) {
            na = this._cloneAssignment(a);
            cur_a = f[i][0];
            na[cur_a] = true;
            this._addTreeNode(t, cur_a);
            /* At this point there is only one literal not evaluated, so
             * its complementary will be unsat */
            this._addTreeNode(t, -cur_a);
            this._addTreeNode(t.children[1], 'UNSAT');
            this._state = [f, na, t.children[0], cur_a];
            return;
        }
    }
    na = this._cloneAssignment(a);
    cur_a = f[0][0];
    na[cur_a] = true;
    this._addTreeNode(t, cur_a);
    this._addTreeNode(t, -cur_a);

    this._state = [f, na, t.children[0], cur_a];
}

Dpll.prototype.nextStep = function() {

    var formula = this._state[0],
        assignment = this._state[1],
        tree = this._state[2],
        cur_a = this._state[3],
        tree_root = this._tree_root;

    if (this._hasFinished(tree_root)) {
        return [ true, formula, this._state ];
    }

    if (formula === false) {
        delete assignment[cur_a];
        assignment[-cur_a] = true;
        this._recDPLL(formula, assignment, tree);
    } else {
        this._recDPLL(formula, assignment, tree);
    }
    this._updateGraph();
    return [ false, undefined, this._state ];
}

/* This is the function that must be call in order to solve a formula */
Dpll.prototype.solve = function(formula, assignment, config) {

    var tree = {
        'name': 'Root',
        'children': []
    };
    this._tree_root = tree;

    if (config) {
        for (var c in config) {
            this._config[c] = config[c];
        }
    }

    this._graph.clean();

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

/* It has finished if every node in the tree has an UNSAT leaf */
Dpll.prototype._hasFinished = function(tree) {
    var c = tree.children;
    if (c !== undefined && c.length === 1 && (c[0].name === 'UNSAT' || c[0].name === 'SAT')) {
        return true;
    } else if (c === undefined || c.length === 0) {
        return false;
    }

    return this._hasFinished(tree.children[0]) && this._hasFinished(tree.children[1]);
}


