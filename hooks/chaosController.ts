type TriggerFn = () => void;
type RoastFn = (message: string) => void;

let triggerBSODFn: TriggerFn | null = null;
let triggerSocialThreatFn: TriggerFn | null = null;
let triggerDrunkBrowserFn: TriggerFn | null = null;
let triggerRoastFn: RoastFn | null = null;

export const chaosController = {
  registerTriggerBSOD(fn: TriggerFn) {
    triggerBSODFn = fn;
    return () => {
      if (triggerBSODFn === fn) {
        triggerBSODFn = null;
      }
    };
  },

  triggerBSOD() {
    triggerBSODFn?.();
  },

  registerTriggerSocialThreat(fn: TriggerFn) {
    triggerSocialThreatFn = fn;
    return () => {
      if (triggerSocialThreatFn === fn) {
        triggerSocialThreatFn = null;
      }
    };
  },

  triggerSocialThreat() {
    triggerSocialThreatFn?.();
  },

  registerTriggerDrunkBrowser(fn: TriggerFn) {
    triggerDrunkBrowserFn = fn;
    return () => {
      if (triggerDrunkBrowserFn === fn) {
        triggerDrunkBrowserFn = null;
      }
    };
  },

  triggerDrunkBrowser() {
    triggerDrunkBrowserFn?.();
  },

  registerTriggerRoast(fn: RoastFn) {
    triggerRoastFn = fn;
    return () => {
      if (triggerRoastFn === fn) {
        triggerRoastFn = null;
      }
    };
  },

  triggerRoast(message: string) {
    triggerRoastFn?.(message);
  },
};
