// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
// Corresponds to the built-in canton-builtin-admin-workflow-ping DAR every participant initializes with

import { TokenStandardClient } from '@canton-network/core-token-standard'

export const createTapCommand = async (party: string) => {
    const baseUrl = 'http://scan.localhost:4000/api/scan/v0/scan-proxy'
    const tokenStandardClient = new TokenStandardClient(
        baseUrl,
        undefined!,
        false // isAdmin,
    )
    const REQUESTED_AT_SKEW_MS = 60_000
    const registryInfo = await tokenStandardClient.get(
        '/registry/metadata/v1/info'
    )
    const instrumentAdmin = registryInfo.adminId
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const choiceArgs = {
        expectedAdmin: instrumentAdmin,
        transfer: {
            sender: instrumentAdmin,
            party,
            amount: 10000,
            instrumentId: { admin: instrumentAdmin, id: 'Amulet' },
            lock: null,
            requestedAt: new Date(
                Date.now() - REQUESTED_AT_SKEW_MS
            ).toISOString(),
            executeBefore: tomorrow.toISOString(),
            inputHoldingCids: [],
            meta: { values: {} },
        },
        extraArgs: {
            context: { values: {} },
            meta: { values: {} },
        },
    }
    const transferFactory = await tokenStandardClient.post(
        '/registry/transfer-instruction/v1/transfer-factory',
        {
            choiceArguments: choiceArgs as unknown as Record<string, never>,
        }
    )
    const disclosedContracts = transferFactory.choiceContext.disclosedContracts
    console.log(disclosedContracts)
    return {
        commands: [
            {
                CreateCommand: {
                    createArguments: {
                        id: `my-test-${new Date().getTime()}`,
                        initiator: party,
                        responder: party,
                    },
                },
            },
        ],
    }
}
