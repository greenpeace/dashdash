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
directly in the selector. In that case the state is included in the generated name.
```scss
.foobar {
  --some-string-- {
    color: green;
    &:hover {
      background-color: white;
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
```

If the element's selector is sufficiently descriptive, you can use the `_--` shorthand to have the prefix be generated
from it. The name generation simply takes anything that is not alphanumeric or a dash, and turns it into maximum 2
dashes.

```scss
.foobar {
  _-- {
    color: green;
    &:hover {
      background-color: white;
    }
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
```
