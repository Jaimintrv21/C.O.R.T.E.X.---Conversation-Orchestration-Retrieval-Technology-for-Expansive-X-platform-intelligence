export const pillSlide = {
  // Snappier spring for active-state sliding background pills
  layoutTransition: { type: "spring", stiffness: 500, damping: 35 }
};

export const cardHover = {
  rest:  { y: 0, scale: 1 },
  hover: { y: -4, scale: 1.01, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } }
};

export const popIn = {
  hidden:  { opacity: 0, scale: 0.96, y: 12 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.3, type: "spring", stiffness: 400, damping: 25 } }
};

export const slideUpBar = {
  hidden:  { opacity: 0, y: 60, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, type: "spring", stiffness: 400, damping: 25 } }
};

export const staggerList = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.03 } }
};

export const listItem = {
  hidden:  { opacity: 0, x: -12, scale: 0.98 },
  visible: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } }
};
