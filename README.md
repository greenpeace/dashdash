# dashdash

![Planet4](./planet4.png)

PostCSS plugin for shorthand CSS variables syntax.

Script to run just after SCSS is compiled into CSS, to convert declarations in any selectors ending with --some-string--
into the same declarations but with a variable around the value. These declarations are added to the selector preceding
the --some-string-- part, which will be created if it doesn't exist yet.

```scss
.foobar {
  --some-string-- {
    color: green;
    background-color: white;
  }
}
```
gets transformed to 
```css
.foobar {
    color: var(--some-string--color: green);
    background-color: var(--some-string--background-color: white);
}
```

Just to get it out of the way: yes, it's a hack. It relies on the shorthand syntax being recognized as a valid custom
HTML element. Still seems a smaller problem than having the same long word scattered in half of the declarations, as 
well as the echoing property names at the end.

I looked for an alternative way to implement this with "vanilla" SCSS, but alas, they all involved rewriting the 
declarations to something inconvenient. I specifically looked for a way to have this shorthand as a wrapper around lines
of existing CSS without needing to change them. I came to the current solution pretty much be elimination. SCSS doesn't
support modifying declarations this way. So instead I implemented it on the result of SCSS, so the script only sees the 
combined selectors. It strips the prefix from the selector, which gives it the "normal" selector to add the declarations
to.

You can also include any element state pseudo selectors, and they will behave the same way as they would when used 
directly in the selector. In that case the state is included in the generated name. If there is more than one state, the
first one is used for the name (but better to give them separate variables, which will allow them to be changed at a
later point without needing a code change).
```scss
.foobar {
  --some-string-- {
    color: green;
    &:hover {
      background-color: white;
    }
    &:active, &:visited {
      background-color: yellow;
    }
  }
}
```
gets transformed to
```css
.foobar {
    color: var(--some-string--color: green);
}
.foobar:hover {
    background-color: var(--some-string--hover--background-color: white);
}
.foobar:active, .foobar:visited {
    background-color: var(--some-string--active--background-color: white);
}
```

If the element's selector is sufficiently descriptive, you can use the `_--` shorthand to have the prefix be generated
from it. The name generation simply takes anything that is not alphanumeric or a dash, and turns it into maximum 2
dashes. This will throw an error when used on multiple selectors.

```scss
.foobar {
  _-- {
    color: green;
    &:hover {
      background-color: white;
    }
  }
}

#header .nav-item {
  _-- {
    color: red;
  }
}
```
gets transformed to
```css
.foobar {
    color: var(--foobar--color: green);
}
.foobar:hover {
    background-color: var(--foobar--hover--background-color: white);
}
#header .nav-item {
    color: var(--header--nav-item--color, red);
}
```

Obviously this will lead to naming conflicts in some cases and is really only advisable on single class or element
selectors.

## Usage with webpack

Ideally you should run this plugin as early as possible in the build, so the other plugins don't need to work with the
shorthand form. This could cause some issues with for example duplicate detection.

```ecmascript 6
module.exports = {
  module: {
    // ...
    rules: [
      // ...
      {
        test: /\.(sass|scss)$/,
        use: [
            // ...
          {
            loader: 'postcss-loader',
            options: {
              ident: 'postcss',
              plugins: () => [
                dashDash(),
                // ...other plugins
              ],
              sourceMap: true
            }
          },
          {
            loader: 'sass-loader',
          }
        ]
      },
    ]
  },
}
```

If you have stylelint set up, you probably need to allow the format with the following rule.
```json
{
    "selector-type-no-unknown": [true, {
	  "ignoreTypes": ["/^--[a-z]\\w*(--?[a-z0-9]+)*--$/", "_--"]
	}]
}
```

## `@media` queries

If the declaration is within a media query, a prefix will be generated from the media query's conditions. This means
queries with multiple conditions result in very long names, which might or might not be a problem. You can pass an alias
map using `mediaQueryAliases`, where each key is the media query's conditions (e.g. `(min-width: 1200px)`), the value is
the alias. By default, this it is added at the start of the variable name.

Nested media queries are not handled yet, in that case it will only use the innermost for the name generation.
