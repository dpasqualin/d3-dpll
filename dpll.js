"use strict";

/*
    This class solves a formula.
    It can receives two parameters as options:
    graph: an instance of the Graph class
    config: a hash with configurations, which might be:
        + step_by_step: boolean to define whether the algorythm should
        wait for a signal to continue to next step (executint
        Dpll.next()) or should execute all at once.
 */
var Dpll = function(graph, config) {
    this._graph = graph;
    this._next_step = true;
    this._finished = false;
    this._is_sat = false;
    this._printed = false; // FIX nextStep logic and discard this var
    this._varsDict = {};
    this._config = config || {
        step_by_step: false
    };
};

/*
    This is the function that must be call in order to solve a formula.
    formula: the dimacs formula
    assignment: an initial assignment, can be an empty object
    config: you can change the default behavior of this class by setting new
        values through this argument
*/
Dpll.prototype.solve = function(formulaStr, assignment, config) {

    this._varsDict = {};

    var formula = this.getClauses(formulaStr, this._varsDict);

    var tree = {
        'name': 'Root',
        'literal': 'Root',
        'children': [],
        'formula': this.getPrintableFormula(formula)
    };

    /* Save a copy of the formula for backtracking purpose */

    this._formula = this._cloneFormula(formula);
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

/*
    Receives a string containing a set of clauses separeted using new lines

    (\n) and return an object containing the formula.
    txt: the string containing the formula
    varsDict: an empty hash which will contain the association between the
        variable literals typed by the user and the variable literals that will be
        used internally by the DPLL.

*/
Dpll.prototype.getClauses = function(txt, varsDict) {
    var clausesLines = txt.split('\n');
    var clauses = [];
    var varCounter = 1;
    var revVarsDict = {}; // var literal -> var num
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

    /* Add SAT and UNSAT on hash to make it easy to print var names on Graph */
    varsDict['SAT'] = 'SAT';
    varsDict['UNSAT'] = 'UNSAT';

    return clauses;
};

/*
    Transform the object formula into a string to be printed on the popup on
    the Graph.
    formula: the formula
    returns: a string with the clauses separated by a html new line tag
*/
Dpll.prototype.getPrintableFormula = function(formula) {
    var clauses = [];
    var f = this._cloneFormula(formula);
    for (var c=0; c<f.length; c++) {
        if (f[c].length === 0) {
            clauses.push("[unsat clause]");
        } else {
            var vars = "";
            for (var v=0; v<f[c].length; v++) {
                var variable = this._getPrintableVar(f[c][v]);
                vars += variable + " ";
            }
            clauses.push(vars.trim());
        }
    }

    return clauses.join("</br>");
};

/*
    Return a string representing the variable, with or without the negation
    symbol '-'.
    v: the variable
    returns: the user representation for v, negated or not
*/
Dpll.prototype._getPrintableVar = function(v) {
    return v<0? '-' + this._varsDict[-v] : this._varsDict[v];
};

/*

    Return a string with the variables which satisfied the formula, or the
    string 'UNSATISFIABLE' if the formula is unsat.
    sol: the last assignment made by the dpll execution

    varsDict: the hash created by Dpll.getClauses()
    returns: a string representing the result

*/
Dpll.prototype.getPrintableSol = function(sol) {
    if (!sol[0]) {
        return 'UNSATISFIABLE';
    }
    var txt = 'SATISFIABLE\n';
    for (var v in sol[1]) {
        txt += this._getPrintableVar(v) + ' ';
    }
    return txt.trim();
};

/*
    Advances to the next step on the DPLL execution.
    This function is intented to be triggered by the web interface. It
    causes the algorithym to evaluate on more variable of the assignment and
    draw the result on the Graph.
*/
Dpll.prototype.nextStep = function() {

    var formula = this._state[0],
        assignment = this._state[1],
        tree = this._state[2],
        cur_a = this._state[3],
        tree_root = this._tree_root;

    if (this._hasFinished(tree_root)) {
        if (this._is_sat && !this._printed) {
            this._printed = true;
            this._setSatPath(tree.children[0]);
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


/* ****************************************************************************
 * PRIVATE METHODS
 * ***************************************************************************/

/*
    Apply an assignment to a clause and return the latter simplified.
    c: a clause
    a: an assignment
    returns: a clause after applying the assignment
*/
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

/*
    Apply a given assignment to a formula
    f: a formula
    a: an assignment
    returns: the formula after applying the assignment
*/
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

/*
    Clone an object that represents an assignment
    a: an assignment
    returns: the assignment cloned into a new object
*/
Dpll.prototype._cloneAssignment = function(a) {
		var na, v;
		na = {};
		for (v in a) {
			na[v] = true;
		}
		return na;
};

/*
    Update the graph, if the user configured one
*/
Dpll.prototype._updateGraph = function () {
    if (!this._graph) {
        return;
    }
    var root = this._tree_root;

    this._graph.draw(root);
}

/*
    Add a new node to the tree used by the Graph class to draw the search
    tree.
    assignment: an assignment
    formula: a formula
    node: the root node where the new node will be added as a child node
    literal: the literal of the new node
*/
Dpll.prototype._addTreeNode = function(assignment, formula, node, literal) {
    var a = this._cloneAssignment(assignment);
    var strFormula = '';

    if (!node.children)
        node.children = [];

    /* Will might be simulating an assignment, so let's make sure the new
     * node was added to the assignment. This is used when we add a new node
     * that we know it's gonna be UNSAT, so it's not even tested by the
     * algorithym, but we want to show this node on the Graph */
    if (literal !== 'UNSAT' && literal !== 'SAT') {
        delete a[String(-parseInt(literal))];
        a[literal] = true;

        /* Apply current assignment to the formula, this formula will be shown
         * as a popup on the Graph */
        var new_f = this._applyAssignment(formula, a)

        strFormula = this.getPrintableFormula(new_f)
    }

    node.children.push({
        'name': this._getPrintableVar(literal),
        'literal': String(literal),
        'children': [],
        'formula': strFormula
    });
}

/*
    Do the magic.
    f: a formula to be checked for satisfiability
    a: an initial assignment (can be an empty hash)
    t: the search tree root node
    returns: an array containing tree objects:
        boolean: true -> SAT, false -> UNSAT
        a: the assignment the implied on the SAT case
        t: the search tree
*/
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

/*
    Receives a SAT node from the search tree and set the path to the root as
    a sat path. This will imply in a path with a different color in the
    Graph.
    node: the sat node on the search tree
*/
Dpll.prototype._setSatPath = function(node) {
    if (node === undefined) {
        this._updateGraph();
        return;
    }
    node.sat_path = true;
    this._setSatPath(node.parent);
};

/*
    When the DPLL reaches an UNSAT path but there is a path which were not
    explored yet, we have to backtrack to this path. At this point only the
    cronological backtrack is implemented.
*/
Dpll.prototype._backtrack = function() {
    var tree = this._state[2];

    for (var i=0; tree.children && i<tree.children.length; i++) {
        var grandson = tree.children[i];
        if (grandson.literal !== 'UNSAT' && !grandson.children) {

            /* Set current assignment */
            var cur_a = parseInt(grandson.literal);
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
            this._state[0] = this._cloneFormula(this._formula);

            return;
        }
    }

    /* Adjust recursion parameter */
    this._state[2] = tree.parent;
    this._backtrack();
}

/*
    Clone a formula.
    formula: the formula to be cloned
    returns: a copy of the formula
*/
Dpll.prototype._cloneFormula = function(formula) {
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

/*
    Check whether the execution of the DPLL has already finished.
    It has finished if all nodes are UNSAT or one node was marked as SAT.
*/
Dpll.prototype._hasFinished = function(tree) {
    if (this._finished) return true;
    var c = tree.children;

    if (c !== undefined && c.length === 1) {
        if (c[0].literal === 'UNSAT') {
            return true;
        } else if (c[0].literal === 'SAT') {
            this._finished = true;
            this._is_sat = true;
            return true;
        }
    } else if (c === undefined || c.length === 0) {
        return false;
    }

    return this._hasFinished(tree.children[0]) && this._hasFinished(tree.children[1]);
}
