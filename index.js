const postcss = require("postcss");

module.exports = postcss.plugin('dash-dash', () => {
    return (css, result) => {
        let prevRule = null;
        css.walkRules(rule => {
            const rulesWithDashDash = rule.selectors.filter(
                selector => /^(.+ )?--[a-z]\w*(-[a-z0-9]+)*--$/.test(selector)
            );

            if (rulesWithDashDash.length === 0) {
                prevRule = rule;
                return;
            }

            if (rule.selectors.length > 1 && rule.selectors.length > rulesWithDashDash) {
                throw new Error('Something went wrong, -- should be on all the selectors' . rule.selectors.join());
            }

            const parts = rule.selectors[0].split(' ');
            parts.reverse();
            const prefix = parts[0];

            console.log(prefix);

            const newDecls = [];
            rule.walkDecls(decl=> {
                const newDecl = postcss.decl({
                    prop: decl.prop,
                    value: `var(${prefix}${decl.prop}, ${decl.value})`,
                });
                newDecls.push(newDecl);
                decl.remove();
            });

            const expectedTargetSelectors = rule.selectors.map(selector=> selector.replace(` ${ prefix }`, ''))
            const expectedTargetSelector = expectedTargetSelectors.join();

            if (prevRule && prevRule.parent === rule.parent && prevRule.selectors.join() === expectedTargetSelector) {
                console.log('FOUND EXISTING: ', prevRule.selectors.join());
                prevRule.append(newDecls);
            } else {
                console.log('CREATING NEW', !prevRule ? 'prev rule is null' : expectedTargetSelector);
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
    }
})
