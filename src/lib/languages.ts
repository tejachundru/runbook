export interface Language {
  id: string;
  label: string;
  monacoLang: string;
  fileExt: string;
  defaultCode: string;
  snippets: { name: string; code: string }[];
}

export const LANGUAGES: Language[] = [
  {
    id: "typescript",
    label: "TypeScript",
    monacoLang: "typescript",
    fileExt: "ts",
    defaultCode: `const greet = (name: string): string => \`Hello, \${name}!\`;\nconsole.log(greet('world'));`,
    snippets: [
      {
        name: "Fetch + type",
        code: `interface Post {\n  id: number;\n  title: string;\n  body: string;\n}\n\nasync function fetchPost(id: number): Promise<Post> {\n  const res = await fetch(\`https://jsonplaceholder.typicode.com/posts/\${id}\`);\n  if (!res.ok) throw new Error(\`HTTP \${res.status}\`);\n  return res.json() as Promise<Post>;\n}\n\nconst post = await fetchPost(1);\nconsole.log(post.title);`,
      },
      {
        name: "Array pipeline",
        code: `const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];\n\nconst result = nums\n  .filter((n) => n % 2 === 0)\n  .map((n) => n * n)\n  .reduce((acc, n) => acc + n, 0);\n\nconsole.log(result); // 220`,
      },
      {
        name: "Class with interface",
        code: `interface Shape {\n  area(): number;\n  perimeter(): number;\n}\n\nclass Rectangle implements Shape {\n  constructor(private width: number, private height: number) {}\n\n  area() { return this.width * this.height; }\n  perimeter() { return 2 * (this.width + this.height); }\n}\n\nconst rect = new Rectangle(5, 3);\nconsole.log(\`Area: \${rect.area()}, Perimeter: \${rect.perimeter()}\`);`,
      },
      {
        name: "Generics utility",
        code: `function groupBy<T, K extends string | number>(\n  items: T[],\n  keyFn: (item: T) => K,\n): Record<K, T[]> {\n  return items.reduce((acc, item) => {\n    const key = keyFn(item);\n    (acc[key] ??= []).push(item);\n    return acc;\n  }, {} as Record<K, T[]>);\n}\n\nconst words = ["apple", "avocado", "banana", "blueberry", "cherry"];\nconst byLetter = groupBy(words, (w) => w[0]);\nconsole.log(JSON.stringify(byLetter, null, 2));`,
      },
    ],
  },
  {
    id: "javascript",
    label: "JavaScript",
    monacoLang: "javascript",
    fileExt: "js",
    defaultCode: `const greet = (name) => \`Hello, \${name}!\`;\nconsole.log(greet('world'));`,
    snippets: [
      {
        name: "Promise.all",
        code: `async function delay(ms, value) {\n  return new Promise((resolve) => setTimeout(() => resolve(value), ms));\n}\n\nconst [a, b, c] = await Promise.all([\n  delay(10, "first"),\n  delay(5, "second"),\n  delay(1, "third"),\n]);\n\nconsole.log(a, b, c);`,
      },
      {
        name: "Array methods",
        code: `const people = [\n  { name: "Alice", age: 30 },\n  { name: "Bob", age: 25 },\n  { name: "Charlie", age: 35 },\n];\n\nconst result = people\n  .filter((p) => p.age >= 30)\n  .map((p) => p.name)\n  .sort();\n\nconsole.log(result);`,
      },
      {
        name: "Destructuring",
        code: `const user = { name: "Alice", role: "admin", address: { city: "NYC" } };\nconst { name, role = "user", address: { city } } = user;\nconsole.log(name, role, city);\n\nconst nums = [10, 20, 30, 40, 50];\nconst [first, second, ...rest] = nums;\nconsole.log(first, second, rest);`,
      },
    ],
  },
  {
    id: "python",
    label: "Python",
    monacoLang: "python",
    fileExt: "py",
    defaultCode: `def greet(name: str) -> str:\n    return f"Hello, {name}!"\n\nprint(greet("world"))`,
    snippets: [
      {
        name: "List comprehension",
        code: `numbers = range(1, 21)\n\n# Filter even squares\neven_squares = [x**2 for x in numbers if x % 2 == 0]\nprint(even_squares)\n\n# Flatten 2D list\nmatrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]\nflat = [n for row in matrix for n in row]\nprint(flat)\n\n# Dict comprehension\nword_lengths = {word: len(word) for word in ["python", "is", "awesome"]}\nprint(word_lengths)`,
      },
      {
        name: "Dataclass",
        code: `from dataclasses import dataclass, field\nfrom typing import List\n\n@dataclass\nclass Student:\n    name: str\n    grade: float\n    courses: List[str] = field(default_factory=list)\n\n    def gpa_status(self) -> str:\n        if self.grade >= 3.5:\n            return "Honors"\n        elif self.grade >= 2.0:\n            return "Passing"\n        return "At risk"\n\nalice = Student("Alice", 3.8, ["Math", "Physics"])\nprint(alice)\nprint(alice.gpa_status())`,
      },
      {
        name: "Enumerate + zip",
        code: `names = ["Alice", "Bob", "Charlie"]\nscores = [88, 92, 79]\n\n# enumerate\nfor i, name in enumerate(names, start=1):\n    print(f"{i}. {name}")\n\nprint()\n\n# zip\nfor name, score in zip(names, scores):\n    grade = "A" if score >= 90 else "B" if score >= 80 else "C"\n    print(f"{name}: {score} ({grade})")`,
      },
      {
        name: "Generator",
        code: `def fibonacci(limit: int):\n    a, b = 0, 1\n    while a <= limit:\n        yield a\n        a, b = b, a + b\n\nfibs = list(fibonacci(100))\nprint(fibs)\n\n# Generator expression\ntotal = sum(x**2 for x in range(10))\nprint(f"Sum of squares 0-9: {total}")`,
      },
    ],
  },
  {
    id: "rust",
    label: "Rust",
    monacoLang: "rust",
    fileExt: "rs",
    defaultCode: `fn main() {\n    let name = "world";\n    println!("Hello, {}!", name);\n}`,
    snippets: [
      {
        name: "Struct + impl",
        code: `use std::fmt;\n\nstruct Point {\n    x: f64,\n    y: f64,\n}\n\nimpl Point {\n    fn new(x: f64, y: f64) -> Self {\n        Point { x, y }\n    }\n\n    fn distance(&self, other: &Point) -> f64 {\n        ((self.x - other.x).powi(2) + (self.y - other.y).powi(2)).sqrt()\n    }\n}\n\nimpl fmt::Display for Point {\n    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {\n        write!(f, "({}, {})", self.x, self.y)\n    }\n}\n\nfn main() {\n    let a = Point::new(0.0, 0.0);\n    let b = Point::new(3.0, 4.0);\n    println!("Distance from {} to {}: {}", a, b, a.distance(&b));\n}`,
      },
      {
        name: "Iterator chain",
        code: `fn main() {\n    let numbers = vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10];\n\n    let result: Vec<i32> = numbers\n        .iter()\n        .filter(|&&x| x % 2 == 0)\n        .map(|&x| x * x)\n        .collect();\n\n    println!("{:?}", result);\n\n    let sum: i32 = result.iter().sum();\n    println!("Sum: {}", sum);\n}`,
      },
      {
        name: "Match + Result",
        code: `#[derive(Debug)]\nenum AppError {\n    ParseError(String),\n    OutOfRange(i32),\n}\n\nfn parse_positive(s: &str) -> Result<i32, AppError> {\n    let n = s.parse::<i32>().map_err(|e| AppError::ParseError(e.to_string()))?;\n    if n <= 0 {\n        return Err(AppError::OutOfRange(n));\n    }\n    Ok(n)\n}\n\nfn main() {\n    for input in &["42", "-5", "abc", "100"] {\n        match parse_positive(input) {\n            Ok(n) => println!("{} -> Ok({})", input, n),\n            Err(e) => println!("{} -> Err({:?})", input, e),\n        }\n    }\n}`,
      },
    ],
  },
];

export const getLang = (id: string): Language =>
  LANGUAGES.find((l) => l.id === id) ?? LANGUAGES[0];

// ─── Enabled Languages ────────────────────────────────────────────────────────
// Stored as a comma-separated setting key ("enabled_languages") in SQLite.
// If no preference is saved, ALL languages are enabled.

const ENABLED_KEY = "enabled_languages";

/** Parse the stored setting into a Set of language IDs. */
export function parseEnabledIds(raw: string | null): Set<string> {
  if (!raw || raw.trim() === "") return new Set(LANGUAGES.map((l) => l.id));
  const ids = raw.split(",").map((s) => s.trim()).filter(Boolean);
  return ids.length > 0 ? new Set(ids) : new Set(LANGUAGES.map((l) => l.id));
}

/** Serialise a Set of IDs back to the stored format. */
export function serializeEnabledIds(ids: Set<string>): string {
  return [...ids].join(",");
}

/** Return only the enabled Language objects. */
export function filterEnabled(raw: string | null): Language[] {
  const enabled = parseEnabledIds(raw);
  return LANGUAGES.filter((l) => enabled.has(l.id));
}
