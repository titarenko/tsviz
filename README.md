# tsviz

Tool to visualize your TypeScript source code using UML+ diagrams.

## Usage

`npm start -- <pattern1> <pattern2> ... <patternN> <output>`

where:

- `patternX` is glob pattern of path(s) to `ts` files to be parsed and visualized (for example, `~/my-awesome-project/**/*.ts`)
- `output` is path to `png` image with visualization (for example, `~/my-awesome-project/diagram.png`)

## Status

Alpha: potentially usable, but is not considered as final.

![example](example.png)

## License

MIT
