/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    IRequest,
} from "@microsoft/fluid-component-core-interfaces";
import { fromBase64ToUtf8 } from "@microsoft/fluid-core-utils";
import { IOdspResolvedUrl } from "@microsoft/fluid-odsp-driver";
import {
    IResolvedUrl,
    IUrlResolver,
} from "@microsoft/fluid-protocol-definitions";
import * as sha from "sha.js";

const fluidOfficeServers = [
    "dev.fluid.office.com",
    "fluidpreview.office.net",
];

export class FluidAppOdspUrlResolver implements IUrlResolver {

    public async resolve(request: IRequest): Promise<IResolvedUrl> {
        const reqUrl = new URL(request.url);
        const server = reqUrl.hostname.toLowerCase();
        if (fluidOfficeServers.indexOf(server) !== -1) {
            const { site, drive, item } = await initializeFluidOffice(reqUrl);
            if (site === undefined || drive === undefined || item === undefined) {
                return Promise.reject("Cannot resolve the given url!!");
            }
            const hashedDocumentId = new sha.sha256().update(`${site}_${drive}_${item}`).digest("hex");

            let documentUrl = `fluid-odsp://placeholder/placeholder/${hashedDocumentId}`;

            if (request.url.length > 0) {
              // In case of any additional parameters add them back to the url
              const requestURL = new URL(request.url);
              const searchParams = requestURL.search;
              if (!!searchParams) {
                documentUrl += searchParams;
              }
            }
            const response: IOdspResolvedUrl = {
              endpoints: { snapshotStorageUrl: getSnapshotUrl(site, drive, item) },
              tokens: {},
              type: "fluid",
              url: documentUrl,
              hashedDocumentId,
              siteUrl: site,
              driveId: drive,
              itemId: item,
            };
            return response;
        }
        return Promise.reject("Cannot resolve the given url!!");
    }
}

function getSnapshotUrl(server: string, drive: string, item: string) {
    const siteOrigin = new URL(server).origin;
    return `${siteOrigin}/_api/v2.1/drives/${drive}/items/${item}/opStream/snapshots`;
}

async function initializeFluidOffice(urlSource: URL) {
    const pathname = urlSource.pathname;
    const siteDriveItemMatch = pathname.match(/\/p\/([^\/]*)\/([^\/]*)\/([^\/]*)/);

    if (siteDriveItemMatch === null) {
        return Promise.reject("Unable to parse fluid.office.com URL path");
    }

    const site = decodeURIComponent(siteDriveItemMatch[1]);

    // Path value is base64 encoded so need to decode first
    const decodedSite = fromBase64ToUtf8(site);

    // Site value includes storage type
    const storageType = decodedSite.split(":")[0];
    const expectedStorageType = "spo";  // Only support spo for now
    if (storageType !== expectedStorageType) {
        return Promise.reject(`Unexpected storage type ${storageType}, expected: ${expectedStorageType}`);
    }

    // Since we have the drive and item, only take the host ignore the rest
    const siteUrl = decodedSite.substring(storageType.length + 1);
    const drive = decodeURIComponent(siteDriveItemMatch[2]);
    const item = decodeURIComponent(siteDriveItemMatch[3]);
    return { site: siteUrl, drive, item };
}
