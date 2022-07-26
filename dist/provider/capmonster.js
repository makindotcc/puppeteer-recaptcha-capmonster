"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROVIDER_ID = void 0;
exports.PROVIDER_ID = "capmonster";
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)(`puppeteer-extra-plugin:recaptcha-capmonster:${exports.PROVIDER_ID}`);
const secondsBetweenDates = (before, after) => (after.getTime() - before.getTime()) / 1000;
class CapMonsterProvider {
    constructor(solver) {
        this.decodeRecaptchaAsync = async (token, captcha) => {
            return new Promise((resolve) => {
                const cb = (err, result) => resolve({ err, result });
                try {
                    this.solver.setApiKey(token);
                    let method = captcha._vendor === "hcaptcha" ? "HCaptchaTask" : "NoCaptchaTask";
                    debug("Decoding captcha...", method, captcha);
                    this.solver.decodeReCaptcha(method, captcha.url, captcha.sitekey, cb);
                }
                catch (error) {
                    return resolve({ err: error });
                }
            });
        };
        this.getSolutions = async (captchas = [], token = "") => {
            const solutions = await Promise.all(captchas.map((c) => this.getSolution(c, token)));
            return { solutions, error: solutions.find((s) => !!s.error) };
        };
        this.getSolution = async (captcha, token) => {
            const solution = {
                _vendor: captcha._vendor,
                provider: exports.PROVIDER_ID
            };
            try {
                if (!captcha || !captcha.sitekey || !captcha.url || !captcha.id) {
                    throw new Error("Missing data in captcha");
                }
                solution.id = captcha.id;
                solution.requestAt = new Date();
                debug("Requesting solution..", solution);
                const { err, result } = await this.decodeRecaptchaAsync(token, captcha);
                debug("Got response", { err, result });
                if (err)
                    throw new Error(`${exports.PROVIDER_ID} error: ${err}`);
                if (!result || !result.text || !result.id) {
                    throw new Error(`${exports.PROVIDER_ID} error: Missing response data: ${result}`);
                }
                solution.providerCaptchaId = result.id;
                solution.text = result.text;
                solution.responseAt = new Date();
                solution.hasSolution = !!solution.text;
                solution.duration = secondsBetweenDates(solution.requestAt, solution.responseAt);
            }
            catch (error) {
                debug("Error", error);
                solution.error = error.toString();
            }
            return solution;
        };
        this.solver = solver;
    }
}
exports.default = CapMonsterProvider;
//# sourceMappingURL=capmonster.js.map