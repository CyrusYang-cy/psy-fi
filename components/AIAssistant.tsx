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
import { Send, X, Loader2, Sparkles } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of messages when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Reset new message indicator when chat is opened
  useEffect(() => {
    if (isOpen) {
      setHasNewMessage(false);
    }
  }, [isOpen]);

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
            className="h-14 w-14 rounded-full bg-pink-500 hover:bg-pink-600 shadow-lg flex items-center justify-center relative"
            onClick={() => setIsOpen(true)}
          >
            <div className="relative">
              <Sparkles className="h-6 w-6 text-white" />
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
          <SheetHeader className="p-4 border-b bg-pink-500">
            <div className="flex justify-between items-center">
              <SheetTitle className="flex items-center gap-2 text-white">
                <Sparkles className="h-5 w-5" />
                Penny
              </SheetTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 text-white hover:bg-pink-600"
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
                      ? "bg-pink-500 text-white"
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
                className="min-h-[60px] resize-none bg-gray-800 border-gray-700 focus-visible:ring-pink-400"
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
                className="h-[60px] w-[60px] flex-shrink-0 bg-pink-500 hover:bg-pink-600"
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
