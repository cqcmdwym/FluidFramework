/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import registerDebug from "debug";
import { pkgName, pkgVersion } from "./packageVersion";
export const debug = registerDebug("fluid:cell");
debug(`Package: ${pkgName} - Version: ${pkgVersion}`);
//# sourceMappingURL=debug.js.map