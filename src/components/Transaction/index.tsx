'use client';

import DeterministicDeployFactoryABI from '@/abi/DeterministicDeployFactory.json';
import TestContractABI from '@/abi/TestContract.json';
import TestContractBytecode from '@/abi/TestContractBytecode.json';
import { Button, LiveFeedback } from '@worldcoin/mini-apps-ui-kit-react';
import { MiniKit } from '@worldcoin/minikit-js';
import { useWaitForTransactionReceipt } from '@worldcoin/minikit-react';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { createPublicClient, encodeDeployData, http } from 'viem';
import { worldchain } from 'viem/chains';

/**
 * This component is used to get a token from a contract
 * For this to work you need to add the contract address to both contract entrypoints and permit2 tokens
 * inside of  Dev Portal > Configuration > Advanced
 * The general design pattern here is
 * 1. Trigger the transaction
 * 2. Update the transaction_id from the response to poll completion
 * 3. Wait in a useEffect for the transaction to complete
 */
export const Transaction = () => {
  const session = useSession();
  const deterministicDeployFactory = '0x423e6C871E2c23bBB8f3cB0D1E04813743d878C7';
  const [buttonState, setButtonState] = useState<
    'pending' | 'success' | 'failed' | undefined
  >(undefined);

  // This triggers the useWaitForTransactionReceipt hook when updated
  const [transactionId, setTransactionId] = useState<string>('');

  // Feel free to use your own RPC provider for better performance
  const client = createPublicClient({
    chain: worldchain,
    transport: http('https://worldchain-mainnet.g.alchemy.com/public'),
  });

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    isError,
    error,
  } = useWaitForTransactionReceipt({
    client: client,
    appConfig: {
      app_id: process.env.NEXT_PUBLIC_APP_ID as `app_${string}`,
    },
    transactionId: transactionId,
  });

  useEffect(() => {
    if (transactionId && !isConfirming) {
      if (isConfirmed) {
        console.log('Transaction confirmed!');
        setButtonState('success');
        setTimeout(() => {
          setButtonState(undefined);
        }, 3000);
      } else if (isError) {
        console.error('Transaction failed:', error);
        setButtonState('failed');
        setTimeout(() => {
          setButtonState(undefined);
        }, 3000);
      }
    }
  }, [isConfirmed, isConfirming, isError, error, transactionId]);

  // This is a basic transaction call to mint a token
  const onClickDeploy = async () => {
    setTransactionId('');
    setButtonState('pending');

    console.log("wallet address: ", session?.data?.user?.walletAddress);

    try {
      const initCode = encodeDeployData({
        abi: TestContractABI,
        bytecode: TestContractBytecode.object as `0x${string}`,
        args: ['Hello!', '0x2cFc85d8E48F8EAB294be644d9E25C3030863003'],
      });

      const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
        transaction: [
          {
            address: deterministicDeployFactory,
            abi: DeterministicDeployFactoryABI,
            functionName: 'deploy',
            args: [
              initCode,
              '0x0000000000000000000000000000000000000000000000000000000000000000',
            ],
          },
        ],
        formatPayload: false,
      });

      if (finalPayload.status === 'success') {
        console.log(
          'Transaction submitted, waiting for confirmation:',
          finalPayload.transaction_id,
        );
        setTransactionId(finalPayload.transaction_id);
      } else {
        console.error('Transaction submission failed:', finalPayload);
        setButtonState('failed');
        setTimeout(() => {
          setButtonState(undefined);
        }, 3000);
      }
    } catch (err) {
      console.error('Error sending transaction:', err);
      setButtonState('failed');
      setTimeout(() => {
        setButtonState(undefined);
      }, 3000);
    }
  };

  return (
    <div className="grid w-full gap-4">
      <p className="text-lg font-semibold">Transaction</p>
      <p>{session?.data?.user?.walletAddress}</p>
      <LiveFeedback
        label={{
          failed: 'Transaction failed',
          pending: 'Transaction pending',
          success: 'Transaction successful',
        }}
        state={buttonState}
        className="w-full"
      >
        <Button
          onClick={onClickDeploy}
          disabled={buttonState === 'pending'}
          size="lg"
          variant="primary"
          className="w-full"
        >
          Deploy Contract
        </Button>
      </LiveFeedback>
    </div>
  );
};
