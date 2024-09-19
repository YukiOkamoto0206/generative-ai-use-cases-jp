import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Markdown from './Markdown';
import ButtonCopy from './ButtonCopy';
import ButtonFeedback from './ButtonFeedback';
import ZoomUpImage from './ZoomUpImage';
import { PiUserFill, PiChalkboardTeacher } from 'react-icons/pi';
import { BaseProps } from '../@types/common';
import { ShownMessage } from 'generative-ai-use-cases-jp';
import BedrockIcon from '../assets/bedrock.svg?react';
import useChat from '../hooks/useChat';
import useTyping from '../hooks/useTyping';
import useFileApi from '../hooks/useFileApi';
import FileCard from './FileCard';
import FeedbackForm from './FeedbackForm';

type Props = BaseProps & {
  idx?: number;
  chatContent?: ShownMessage;
  loading?: boolean;
  hideFeedback?: boolean;
};

const ChatMessage: React.FC<Props> = (props) => {
  const chatContent = useMemo(() => {
    return props.chatContent;
  }, [props]);

  const { pathname } = useLocation();
  const { sendFeedback } = useChat(pathname);
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [showThankYouMessage, setShowThankYouMessage] = useState(false);
  const { getFileDownloadSignedUrl } = useFileApi();

  const { setTypingTextInput, typingTextOutput } = useTyping(
    chatContent?.role === 'assistant' && props.loading
  );

  useEffect(() => {
    if (chatContent?.content) {
      setTypingTextInput(chatContent?.content);
    }
  }, [chatContent, setTypingTextInput]);

  const [signedUrls, setSignedUrls] = useState<string[]>([]);

  useEffect(() => {
    if (chatContent?.extraData) {
      // ローディング表示にするために、画像の数だけ要素を用意して、undefinedを初期値として設定する
      setSignedUrls(new Array(chatContent.extraData.length).fill(undefined));
      Promise.all(
        chatContent.extraData.map(async (file) => {
          return await getFileDownloadSignedUrl(file.source.data);
        })
      ).then((results) => setSignedUrls(results));
    } else {
      setSignedUrls([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatContent]);

  const disabled = useMemo(() => {
    return isSendingFeedback || !props.chatContent?.id;
  }, [isSendingFeedback, props]);

  const onSendFeedback = async (feedback: string) => {
    if (!disabled) {
      setIsSendingFeedback(true);
      if (feedback !== chatContent?.feedback) {
        await sendFeedback(props.chatContent!.createdDate!, feedback);
        if (feedback !== 'bad') {
          setShowFeedbackForm(false);
        }  
      } else {
        await sendFeedback(props.chatContent!.createdDate!, 'none');
        setShowFeedbackForm(false);
      }
      setIsSendingFeedback(false);
    }
  };

  // badボタン押した際、ユーザーからの詳細フィードバック前にDBに送る。
  const handleFeedbackClick = (feedback: string) => {
    onSendFeedback(feedback);
    if (feedback === 'bad' && chatContent?.feedback !== 'bad') {
      setShowFeedbackForm(true);
    }
  };

  const handleFeedbackFormSubmit = async (selectedReason: string[], feedbackText: string) => {
    // TODO: api call
    console.log(selectedReason, feedbackText);
    setShowFeedbackForm(false);
    setShowThankYouMessage(true);
    setTimeout(() => {
      setShowThankYouMessage(false);
    }, 3000);  
  };

  const handleFeedbackFormCancel = () => {
    setShowFeedbackForm(false);
  };

  return (
    <div
      className={`flex justify-center ${
        chatContent?.role === 'assistant' || chatContent?.role === 'system'
          ? 'bg-gray-100/70'
          : ''
      }`}>
      <div
        className={`${
          props.className ?? ''
        } flex w-full flex-col justify-between p-3 md:w-11/12 lg:w-5/6 xl:w-4/6`}>
        <div className="flex w-full">
          {chatContent?.role === 'user' && (
            <div className="bg-aws-sky h-min rounded p-2 text-xl text-white">
              <PiUserFill />
            </div>
          )}
          {chatContent?.role === 'assistant' && (
            <div className="bg-aws-ml h-min rounded p-1">
              <BedrockIcon className="size-7 fill-white" />
            </div>
          )}
          {chatContent?.role === 'system' && (
            <div className="bg-aws-sky h-min rounded p-2 text-xl text-white">
              <PiChalkboardTeacher />
            </div>
          )}

          <div className="ml-5 w-full pr-14">
            {chatContent?.trace && (
              <details className="mb-2 cursor-pointer rounded border p-2">
                <summary className="text-sm">
                  <div className="inline-flex gap-1">
                    トレース
                    {props.loading && !chatContent?.content && (
                      <div className="border-aws-sky size-5 animate-spin rounded-full border-4 border-t-transparent"></div>
                    )}
                  </div>
                </summary>
                <Markdown prefix={`${props.idx}-trace`}>
                  {chatContent.trace}
                </Markdown>
              </details>
            )}
            {chatContent?.extraData && (
              <div className="mb-2 flex flex-wrap gap-2">
                {chatContent.extraData.map((data, idx) => {
                  if (data.type === 'image') {
                    return (
                      <ZoomUpImage
                        key={idx}
                        src={signedUrls[idx]}
                        size="m"
                        loading={!signedUrls[idx]}
                      />
                    );
                  } else if (data.type === 'file') {
                    return (
                      <FileCard
                        key={idx}
                        filename={data.name}
                        url={signedUrls[idx]}
                        loading={!signedUrls[idx]}
                        size="m"
                      />
                    );
                  }
                })}
              </div>
            )}
            {chatContent?.role === 'user' && (
              <div className="break-all">
                {typingTextOutput.split('\n').map((c, idx) => (
                  <div key={idx}>{c}</div>
                ))}
              </div>
            )}
            {chatContent?.role === 'assistant' && (
              <Markdown prefix={`${props.idx}`}>
                {typingTextOutput +
                  `${
                    props.loading && (chatContent?.content ?? '') !== ''
                      ? '▍'
                      : ''
                  }`}
              </Markdown>
            )}
            {chatContent?.role === 'system' && (
              <div className="break-all">
                {typingTextOutput.split('\n').map((c, idx) => (
                  <div key={idx}>{c}</div>
                ))}
              </div>
            )}
            {props.loading && (chatContent?.content ?? '') === '' && (
              <div className="animate-pulse">▍</div>
            )}

            {chatContent?.role === 'assistant' && (
              <div className="mb-1 mt-2 text-right text-xs text-gray-400 lg:mb-0">
                {chatContent?.llmType}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-start justify-end print:hidden">
          {(chatContent?.role === 'user' || chatContent?.role === 'system') && (
            <div className="lg:w-8"></div>
          )}
          {chatContent?.role === 'assistant' &&
            !props.loading &&
            !props.hideFeedback && (
              <>
                <ButtonCopy
                  className="mr-0.5 text-gray-400"
                  text={chatContent?.content || ''}
                />
                {chatContent && (
                  <>
                    <ButtonFeedback
                      className="mx-0.5"
                      feedback="good"
                      message={chatContent}
                      disabled={disabled}
                      onClick={() => {
                        handleFeedbackClick('good');
                      }}
                    />
                    <ButtonFeedback
                      className="ml-0.5"
                      feedback="bad"
                      message={chatContent}
                      disabled={disabled}
                      onClick={() => handleFeedbackClick('bad')}
                    />
                  </>
                )}
              </>
            )}
        </div>
        <div>
          {showFeedbackForm && (
            <FeedbackForm
              onSubmit={handleFeedbackFormSubmit}
              onCancel={handleFeedbackFormCancel}
            />
          )}
          {showThankYouMessage && (
            <div className="mt-2 p-2 bg-green-100 text-center text-green-700 rounded-md">
              フィードバックを受け付けました。ありがとうございます。
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
