const postcss = require("postcss");

const replaceShorthandSelectors = (css, result) => {
    let prevRule = null;
    css.walkRules(rule => {
        const rulesWithDashDash = rule.selectors.filter(
            selector => /^(.+ )?--[a-z]\w*(-[a-z0-9]+)*--$/.test(selector)
        );

        // Nothing to do here, go to next rule.
        if (rulesWithDashDash.length === 0) {
            prevRule = rule;
            return;
        }

        // If somehow there is a shorthand on some but not all of the selectors, we cannot do the substitution.
        // Not sure if that's possible but we definitely want the build to fail in that case.
        if (rule.selectors.length > 1 && rule.selectors.length > rulesWithDashDash) {
            throw new Error('Something went wrong, -- should be on all the selectors ' . rule.selectors.join());
        }

        const parts = rule.selectors[0].split(' ');
        parts.reverse();
        const prefix = parts[0];
        const newDecls = [];

        rule.walkDecls(decl=> {
            const varName = `${prefix}${decl.prop}`;
            const newDecl = postcss.decl({
                prop: decl.prop,
                value: `var(${varName}, ${decl.value})`,
            });
            newDecls.push(newDecl);
            decl.remove();
        });

        const expectedTargetSelectors = rule.selectors.map(selector=> selector.replace(` ${ prefix }`, ''))
        const expectedTargetSelector = expectedTargetSelectors.join();

        if (prevRule && prevRule.parent === rule.parent && prevRule.selectors.join() === expectedTargetSelector) {
            prevRule.append(newDecls);
        } else {
            const newRule = postcss.rule({
                selectors: expectedTargetSelectors,
                source: rule.source,
            });
            newRule.append(...newDecls);
            rule.after(newRule);
            rule.remove();
            prevRule = newRule;
        }
    })
};

module.exports = postcss.plugin('dash-dash', () => replaceShorthandSelectors)
