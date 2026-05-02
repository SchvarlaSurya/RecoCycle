"use client";

import { motion, Variants } from "framer-motion";
import { usePathname } from "next/navigation";

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const pageVariants: Variants = {
    initial: {
      opacity: 0,
      y: 15,
      filter: "blur(5px)",
      scale: 0.99
    },
    enter: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      scale: 1,
      transition: {
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1], 
      }
    }
  };

  return (
    
    <motion.div
      key={pathname}
      variants={pageVariants}
      initial="initial"
      animate="enter"
      className="h-full w-full"
    >
      {children}
    </motion.div>
  );
}
