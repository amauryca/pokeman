import { motion, AnimatePresence } from "framer-motion";

interface SplashScreenProps {
  show: boolean;
}

const SplashScreen = ({ show }: SplashScreenProps) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-primary"
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          {/* Pokéball */}
          <motion.div
            className="relative w-24 h-24 mb-6"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* Top half - red */}
            <div className="absolute top-0 w-24 h-12 rounded-t-full bg-primary-foreground" />
            {/* Bottom half - white */}
            <div className="absolute bottom-0 w-24 h-12 rounded-b-full bg-primary-foreground/30" />
            {/* Center line */}
            <div className="absolute top-[46px] w-24 h-2 bg-foreground/20" />
            {/* Center button */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-4 border-foreground/20 bg-primary-foreground" />
          </motion.div>

          <motion.h1
            className="text-3xl font-heading font-bold text-primary-foreground"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            PokéMarket
          </motion.h1>
          <motion.p
            className="text-primary-foreground/70 mt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            Loading your collection...
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
