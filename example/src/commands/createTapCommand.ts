// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
// Corresponds to the built-in canton-builtin-admin-workflow-ping DAR every participant initializes with

import { TokenStandardClient } from '@canton-network/core-token-standard'
import { ScanProxyClient } from '@canton-network/core-splice-client'
import { pino } from 'pino'

export const createTapCommand = async (party: string) => {
    const logger = pino({ name: 'main', level: 'debug' })
    const tokenStandardClient = new TokenStandardClient(
        'http://scan.localhost:4000',
        logger,
        false // isAdmin
    )
    const scanProxyClient = new ScanProxyClient(
        new URL('http://localhost:2000/api/validator'),
        logger,
        false // isAdmin
    );
    const REQUESTED_AT_SKEW_MS = 60_000
    const registryInfo = await tokenStandardClient.get(
        '/registry/metadata/v1/info'
    )
    const instrumentAdmin = registryInfo.adminId
    const amuletRules = await scanProxyClient.getAmuletRules();
    console.log(amuletRules);
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const choiceArgs = {
        expectedAdmin: instrumentAdmin,
        transfer: {
            sender: instrumentAdmin,
            receiver: party,
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
