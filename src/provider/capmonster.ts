export const PROVIDER_ID = "capmonster";
import * as types from "../types/plugin";

import Debug from "debug";
const debug = Debug(`puppeteer-extra-plugin:recaptcha-capmonster:${PROVIDER_ID}`);

import Solver from "./capmonster-api";

const secondsBetweenDates = (before: Date, after: Date) => (after.getTime() - before.getTime()) / 1000;

export default class CapMonsterProvider {
	private readonly solver: Solver;

	constructor(solver: Solver) {
		this.solver = solver;
	}

	private decodeRecaptchaAsync = async (
		token: string,
		captcha: types.CaptchaInfo,
	): Promise<types.DecodeRecaptchaAsyncResult> => {
		return new Promise((resolve) => {
			const cb = (err: any, result: any) => resolve({ err, result });
			try {
				this.solver.setApiKey(token);
				let method = "";
				if (captcha.isEnterprise) {
					method = "RecaptchaV2EnterpriseTask";
					if (!this.solver.hasProxy()) {
						method += "Proxyless";
					}
				} else if (captcha._vendor === "hcaptcha") {
					method = "HCaptchaTask";
				} else {
					method = "NoCaptchaTask";
				}
				debug("Decoding captcha...", method, captcha);
				this.solver.decodeReCaptcha(method, captcha.url, captcha.sitekey, cb);
			} catch (error) {
				return resolve({ err: error });
			}
		});
	};

	getSolutions = async (captchas: types.CaptchaInfo[] = [], token: string = ""): Promise<types.GetSolutionsResult> => {
		const solutions = await Promise.all(captchas.map((c) => this.getSolution(c, token)));
		return { solutions, error: solutions.find((s) => !!s.error) };
	};

	getSolution = async (captcha: types.CaptchaInfo, token: string): Promise<types.CaptchaSolution> => {
		const solution: types.CaptchaSolution = {
			_vendor: captcha._vendor,
			provider: PROVIDER_ID
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
			if (err) throw new Error(`${PROVIDER_ID} error: ${err}`);
			if (!result || !result.text || !result.id) {
				throw new Error(`${PROVIDER_ID} error: Missing response data: ${result}`);
			}
			solution.providerCaptchaId = result.id;
			solution.text = result.text;
			solution.responseAt = new Date();
			solution.hasSolution = !!solution.text;
			solution.duration = secondsBetweenDates(solution.requestAt, solution.responseAt);
		} catch (error) {
			debug("Error", error);
			solution.error = error.toString();
		}
		return solution;
	};
}
