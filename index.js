const postcss = require("postcss");

const generatePrefix = selector => {
    // Replace
    // 1. the shorthand
    // 2. consecutive non word or dash chars with --
    // 3&4. remove all dashes at start and end, and add exactly 2 at the front.
    return `--${selector.replace(/_--/, '').replace(/[^\w-]+/g, '--').replace(/^-*/, '').replace(/-*$/, '')}`;
}

// Travel up to the first parent that is a media query, and if found generate a prefix from its params.
// NOTE: This does not account for nested media queries for now, it will pick the innermost one only.
const generateMediaQueryPrefix = (rule, aliases) => {
    let parent = rule;

    do {
        parent = parent.parent;
        if (parent && parent.name === 'media') {
            return generatePrefix(aliases[parent.params] ? aliases[parent.params] : parent.params);
        }
    } while (parent);

    // No parent is a media query, so no prefix.
    return '';
}

const DASH_DASH_REGEX = /^(.+ )_?--(\w+(-\w+)*--)*(::?(\w+(-\w+)*))?$/;

const replaceShorthandSelectors = (options) => (css, result) => {
    const {mediaQueryAtStart = true, mediaQueryAliases = {}} = options;
    let prevRule = null;

    css.walkRules(rule => {
        const rulesWithDashDash = rule.selectors.filter(
            selector => DASH_DASH_REGEX.test(selector)
        );

        // Nothing to do here, go to next rule.
        if (rulesWithDashDash.length === 0) {
            prevRule = rule;
            return;
        }

        // If somehow there is a shorthand on some but not all of the selectors, we cannot do the substitution.
        // Not sure if that's possible but we definitely want the build to fail in that case.
        if (rule.selectors.length > 1 && rule.selectors.length > rulesWithDashDash) {
            throw new Error('Something went wrong, -- should be on all the selectors ' + rule.selectors.join());
        }

        const parts = rule.selectors[0].split(' ').reverse();
        const lastPart = parts[0];

        const prefix = `${lastPart.replace(/[:_]/g, '').replace(/--$/, '')}`;
        const withoutPseudo = lastPart.replace(/::?(\w+(-\w+)*)/g, '');

        const isPrefixGenerate = '_--' === withoutPseudo;

        const newDecls = [];

        // Parse each selector with its own rules
        const selectorsWithRules = rule.selectors.reduce(
          (prevSelector, currSelector) => {
            currSelector = `${currSelector.replace(/_--/, '').replace(/--.*--/, '').replace(/ :/g, ':')}`;
            return {
              ...prevSelector,
              ...{[`${currSelector}`]: {
                decls: [],
              }}
            };
          },
          {}
        );

        rule.walkDecls(decl=> {
          // Iterate each selector and append its own declarations
          Object.keys(selectorsWithRules).reduce((prevDecl, currDecl) => {
            const tempDecls = selectorsWithRules[currDecl];
            tempDecls['decls'] = [...tempDecls['decls'], decl];

            return {
              ...prevDecl,
              ...tempDecls,
            };
          }, {});

          // Iterate and clean up duplicated declarations
          rule.selectors.forEach(() => {
            decl.remove();
          });
        });

        Object.keys(selectorsWithRules).forEach((selector) => {
          const clonedRule = rule.cloneAfter({ selector });
          const decls = selectorsWithRules[selector].decls;
          const rulePrefix = isPrefixGenerate ? generatePrefix(selector) : prefix;
          const mediaQueryPrefix = generateMediaQueryPrefix(rule, mediaQueryAliases);
          const elementPrefix = mediaQueryAtStart ? `${mediaQueryPrefix}${rulePrefix}` : `${rulePrefix}${mediaQueryPrefix}`;

          decls.forEach(decl => {
            const varName = `${elementPrefix}--${decl.prop}`;
            const newDecl = decl.clone({value: `var(${varName}, ${decl.value})`});
            clonedRule.append(newDecl);
          });
        });

        // Preserve the pseudo class.
        const expectedTargetSelectors = rule.selectors.map(selector => selector.replace(` ${withoutPseudo}`, ''));
        const expectedTargetSelector = expectedTargetSelectors.join();

        if (prevRule && prevRule.parent === rule.parent && prevRule.selectors.join() === expectedTargetSelector) {
            prevRule.append(newDecls);
            rule.remove();
            return;
        }

        const newRule = postcss.rule({
            selectors: expectedTargetSelectors,
            source: rule.source,
        });
        newRule.append(...newDecls);
        rule.after(newRule);
        rule.remove();
        newRule.remove();
        prevRule = newRule;
    })
};

module.exports = postcss.plugin('dash-dash', (options = {}) => {
    return replaceShorthandSelectors(options);
})
