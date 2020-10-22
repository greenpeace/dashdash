# dashdash

![Planet4](./planet4.png)

PostCSS plugin for shorthand CSS variables syntax.

Script to run just after SCSS is compiled into CSS, to convert declarations in any selectors ending with --some-string-- into the same declarations but with a variable around the value. These declarations are added to the selector preceding the --some-string-- part, which will be created if it doesn't exist yet.