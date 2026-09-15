import { phosphorPaths } from './phosphorPaths.js'

const names = {
  "back": "arrow-left",
  "arrow": "arrow-right",
  "search": "magnifying-glass",
  "signOut": "sign-out",
  "shield": "shield-check",
  "flag": "flag",
  "today": "sun",
  "tasks": "check-square",
  "habits": "arrows-clockwise",
  "goals": "target",
  "areas": "squares-four",
  "inbox": "tray",
  "focus": "crosshair",
  "progress": "chart-bar",
  "activity": "clock-counter-clockwise",
  "rewards": "gift",
  "settings": "sliders-horizontal",
  "plus": "plus",
  "close": "x",
  "check": "check",
  "more": "dots-three",
  "fitness": "barbell",
  "university": "book-open",
  "career": "briefcase",
  "finance": "credit-card",
  "home": "house",
  "style": "t-shirt",
  "food": "fork-knife",
  "creative": "pencil-simple",
  "travel": "map-trifold",
  "personal": "user",
  "leaf": "leaf",
  "appearance": "palette",
  "languageTime": "globe",
  "menu": "list"
}

// Decorative semantic icons inherit the surrounding control or label color.
export function Icon({ name, size = 20, ...props }) {
  const paths = phosphorPaths[names[name]] || phosphorPaths['squares-four']
  return <svg {...props} width={size} height={size} viewBox="0 0 256 256" fill="currentColor" stroke="none" aria-hidden="true" focusable="false">
    {paths.map((d, index) => <path key={index} d={d} />)}
  </svg>
}
