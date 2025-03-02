"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import { Send, X, Loader2, Sparkles, AlertTriangle } from "lucide-react";
import { listenEvent } from "@/lib/eventEmitter";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface MoodData {
  quadrant: string;
  feeling: string;
  note?: string;
  valence: number;
  arousal: number;
}

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi there! I'm Penny, your financial assistant. I can help you make mindful spending decisions based on your mood and purchase history. How are you feeling today?",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(true);
  const [lastMoodData, setLastMoodData] = useState<MoodData | null>(null);
  const [isRiskyMood, setIsRiskyMood] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of messages when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Reset new message indicator when chat is opened
  useEffect(() => {
    if (isOpen) {
      setHasNewMessage(false);
      setIsPulsing(false);
    }
  }, [isOpen]);

  // Listen for mood logged events
  useEffect(() => {
    const unsubscribeMoodLogged = listenEvent(
      "moodLogged",
      (moodData: MoodData) => {
        setLastMoodData(moodData);

        // Analyze if this mood is a risky one for spending
        const isRisky = analyzeRiskyMood(moodData);
        setIsRiskyMood(isRisky);

        // If risky, set hasNewMessage to true to show notification
        if (isRisky) {
          setHasNewMessage(true);
        }
      }
    );

    const unsubscribeOpenAssistant = listenEvent(
      "openAIAssistant",
      (moodData: MoodData) => {
        // Always open the assistant when this event is triggered
        setIsOpen(true);

        // Always provide mood advice, whether risky or not
        provideMoodAdvice(moodData);

        // Start pulsing animation to draw attention
        setIsPulsing(true);
      }
    );

    return () => {
      unsubscribeMoodLogged();
      unsubscribeOpenAssistant();
    };
  }, []);

  // Analyze if a mood is risky for impulsive spending
  const analyzeRiskyMood = (moodData: MoodData): boolean => {
    // High arousal + negative valence (angry, stressed) or high arousal + positive valence (excited, elated)
    // are often associated with impulsive spending

    // Red quadrant (high arousal, negative valence) - angry, stressed
    if (moodData.quadrant === "red") {
      return true;
    }

    // Yellow quadrant (high arousal, positive valence) - excited, elated
    if (moodData.quadrant === "yellow") {
      return true;
    }

    // Specific high-risk feelings regardless of quadrant
    const riskyFeelings = [
      "stressed",
      "angry",
      "anxious",
      "excited",
      "impulsive",
      "frustrated",
      "overwhelmed",
      "bored",
      "sad",
    ];

    if (
      riskyFeelings.some((feeling) =>
        moodData.feeling.toLowerCase().includes(feeling.toLowerCase())
      )
    ) {
      return true;
    }

    return false;
  };

  // Provide personalized advice based on mood
  const provideMoodAdvice = async (moodData: MoodData) => {
    setIsLoading(true);

    // Add a temporary loading message
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: "...",
      },
    ]);

    try {
      // Call your backend API with the mood data
      const response = await fetch(
        `/api/financial-assistant?emotion=${moodData.feeling}&purchase_history=recent purchases include $50 at restaurant, $120 on clothing`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to get response from assistant");
      }

      const data = await response.json();

      // Replace the loading message with the actual response
      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: "assistant",
          content: `I noticed you're feeling **${moodData.feeling}**. ${data.financial_suggestion}`,
        };
        return newMessages;
      });
    } catch (error) {
      console.error("Error getting AI response:", error);
      // Replace the loading message with a fallback message based on the mood
      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: "assistant",
          content: generateFallbackAdvice(moodData),
        };
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Generate fallback advice if the API call fails
  const generateFallbackAdvice = (moodData: MoodData): string => {
    const { quadrant, feeling } = moodData;

    if (quadrant === "red") {
      return `I noticed you're feeling **${feeling}**. When we're experiencing high-energy negative emotions, we sometimes make impulsive purchases to feel better. Consider waiting 24 hours before making any non-essential purchases. Would you like to talk about what's causing these feelings?`;
    }

    if (quadrant === "yellow") {
      return `I noticed you're feeling **${feeling}**. When we're excited or energized, we can sometimes make impulsive purchases. Try making a list of what you want to buy and revisit it in 24 hours to see if you still want these items. How can I help you channel this energy positively?`;
    }

    if (quadrant === "blue") {
      return `I noticed you're feeling **${feeling}**. When we're feeling down, retail therapy can seem appealing. Consider free activities that might boost your mood instead, like going for a walk or calling a friend. Is there something specific that's making you feel this way?`;
    }

    if (quadrant === "green") {
      return `I noticed you're feeling **${feeling}**. This is a good emotional state for making thoughtful financial decisions. If you're considering any purchases, now might be a good time to evaluate them calmly. Would you like me to help you review your budget or savings goals?`;
    }

    return `I noticed you're feeling **${feeling}**. Being aware of our emotions when making financial decisions can help us make choices we won't regret later. How can I help you with your financial goals today?`;
  };

  // Format message content to improve readability
  const formatMessageContent = (content: string): string => {
    if (content === "...") return content;

    // Replace asterisks with proper formatting
    let formatted = content.replace(/\*\*(.*?)\*\*/g, "$1");
    formatted = formatted.replace(/\*(.*?)\*/g, "$1");

    // Convert dash/asterisk lists to proper bullet points
    formatted = formatted.replace(/^\s*[\*\-]\s+/gm, "• ");

    return formatted;
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    // Add user message to chat
    const userMessage = { role: "user" as const, content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Extract emotion from user message (simplified approach)
      const emotion = extractEmotion(input);

      // In a real app, you would fetch purchase history from your backend
      // For now, we'll use a placeholder
      const purchaseHistory =
        "recent purchases include $50 at restaurant, $120 on clothing";

      // Add a temporary loading message
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "...",
        },
      ]);

      // Call your backend API
      const response = await fetch(
        `/api/financial-assistant?emotion=${emotion}&purchase_history=${encodeURIComponent(
          purchaseHistory
        )}`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to get response from assistant");
      }

      const data = await response.json();

      // Replace the loading message with the actual response
      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: "assistant",
          content: data.financial_suggestion,
        };
        return newMessages;
      });
    } catch (error) {
      console.error("Error getting AI response:", error);
      // Replace the loading message with an error message
      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again later.",
        };
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Simple function to extract emotion from text
  // In a real app, you might use NLP or a more sophisticated approach
  const extractEmotion = (text: string): string => {
    const emotions = [
      "happy",
      "sad",
      "angry",
      "anxious",
      "excited",
      "stressed",
    ];
    for (const emotion of emotions) {
      if (text.toLowerCase().includes(emotion)) {
        return emotion;
      }
    }
    return "neutral"; // Default emotion
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            className={`h-14 w-14 rounded-full ${
              isRiskyMood
                ? "bg-amber-500 hover:bg-amber-600"
                : "bg-pink-500 hover:bg-pink-600"
            } shadow-lg flex items-center justify-center relative ${
              isPulsing ? "animate-bounce" : ""
            }`}
            onClick={() => setIsOpen(true)}
          >
            <div className="relative">
              {isRiskyMood ? (
                <AlertTriangle className="h-6 w-6 text-white" />
              ) : (
                <Sparkles className="h-6 w-6 text-white" />
              )}
              <span className="absolute -top-1 -right-1 h-2 w-2 bg-white rounded-full" />
            </div>
            {hasNewMessage && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full animate-pulse" />
            )}
            <span className="sr-only">
              Open Penny, your Financial Assistant
            </span>
          </Button>
        </SheetTrigger>
        <SheetContent
          side="right"
          className="w-[350px] sm:w-[400px] p-0 flex flex-col"
        >
          <SheetHeader
            className={`p-4 border-b ${
              isRiskyMood ? "bg-amber-500" : "bg-pink-500"
            }`}
          >
            <div className="flex justify-between items-center">
              <SheetTitle className="flex items-center gap-2 text-white">
                {isRiskyMood ? (
                  <AlertTriangle className="h-5 w-5" />
                ) : (
                  <Sparkles className="h-5 w-5" />
                )}
                Penny
                {lastMoodData && isRiskyMood && (
                  <span className="text-xs bg-white text-amber-600 px-2 py-0.5 rounded-full font-medium">
                    Spending Alert
                  </span>
                )}
              </SheetTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className={`h-8 w-8 text-white ${
                  isRiskyMood ? "hover:bg-amber-600" : "hover:bg-pink-600"
                }`}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-950">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === "user"
                      ? `${
                          isRiskyMood ? "bg-amber-500" : "bg-pink-500"
                        } text-white`
                      : "bg-gray-800 text-gray-100"
                  }`}
                >
                  {message.content === "..." ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Thinking...</span>
                    </div>
                  ) : (
                    <div className="whitespace-pre-line">
                      {formatMessageContent(message.content)}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t bg-gray-900">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex gap-2"
            >
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className={`min-h-[60px] resize-none bg-gray-800 border-gray-700 focus-visible:ring-${
                  isRiskyMood ? "amber" : "pink"
                }-400`}
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button
                type="submit"
                size="icon"
                disabled={isLoading || !input.trim()}
                className={`h-[60px] w-[60px] flex-shrink-0 ${
                  isRiskyMood
                    ? "bg-amber-500 hover:bg-amber-600"
                    : "bg-pink-500 hover:bg-pink-600"
                }`}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
                <span className="sr-only">Send message</span>
              </Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
