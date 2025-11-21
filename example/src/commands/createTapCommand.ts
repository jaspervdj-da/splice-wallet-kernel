// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
// Corresponds to the built-in canton-builtin-admin-workflow-ping DAR every participant initializes with

import {
    TokenStandardClient,
    HOLDING_INTERFACE_ID,
} from '@canton-network/core-token-standard'
import { ScanProxyClient } from '@canton-network/core-splice-client'
import { pino } from 'pino'
import * as sdk from '@canton-network/dapp-sdk'

export const getHoldings = async (party: string): Promise<void> => {
    const latestPrunedOffsetsResponse = await sdk.ledgerApi({
        requestMethod: 'GET',
        resource: '/v2/state/latest-pruned-offsets',
    })
    const activeAtOffset = JSON.parse(
        latestPrunedOffsetsResponse.response
    ).participantPrunedUpToInclusive
    console.log('activeAtOffset', activeAtOffset)
    const activeContracts = await sdk.ledgerApi({
        requestMethod: 'POST',
        resource: '/v2/state/active-contracts',
        body: JSON.stringify({
            activeAtOffset,
            filter: {
                filtersByParty: {
                    [party]: {
                        cumulative: [
                            {
                                identifierFilter: {
                                    InterfaceFilter: {
                                        value: {
                                            interfaceId: HOLDING_INTERFACE_ID,
                                            includeInterfaceView: true,
                                            includeCreatedEventBlob: true,
                                        },
                                    },
                                },
                            },
                        ],
                    },
                },
            },
        }),
    })
    console.log('active-contracts')
    console.log(activeContracts)
}

export const createTapCommand = async (party: string, sessionToken: string) => {
    const logger = pino({ name: 'main', level: 'debug' })
    const tokenStandardClient = new TokenStandardClient(
        'http://scan.localhost:4000',
        logger,
        false // isAdmin
    )
    const scanProxyClient = new ScanProxyClient(
        new URL('http://localhost:2000/api/validator'),
        logger,
        false, // isAdmin
        sessionToken,
    )
    const REQUESTED_AT_SKEW_MS = 60_000
    const registryInfo = await tokenStandardClient.get(
        '/registry/metadata/v1/info'
    )
    const instrumentAdmin = registryInfo.adminId
    const amuletRules = await scanProxyClient.getAmuletRules()
    console.log(amuletRules)
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
    console.log('disclosedContracts', disclosedContracts)

    const latestOpenMiningRound =
        await scanProxyClient.getActiveOpenMiningRound()
    console.log('latestOpenMiningRound', latestOpenMiningRound)

    return {
        commands: [
            {
                ExerciseCommand: {
                    templateId: amuletRules.template_id!,
                    contractId: amuletRules.contract_id,
                    choice: 'AmuletRules_DevNet_Tap',
                    choiceArgument: {
                        receiver: choiceArgs.transfer.receiver,
                        amount: choiceArgs.transfer.amount,
                        openRound: latestOpenMiningRound!.contract_id,
                    },
                },
            },
        ],
        disclosedContracts,
    }
}
