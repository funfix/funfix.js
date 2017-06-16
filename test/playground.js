const { Eval } = require("../dist/funfix.umd")

console.log(
  Eval.always(() => 1).flatMap(a => Eval.now(a + 1)).run()
)
