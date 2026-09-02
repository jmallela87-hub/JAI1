  async function handleSend(text: string) {
    let chatId = activeChatId;

    if (!chatId) {
      const { data: newChat, error } = await supabase
        .from("chats")
        .insert({
          user_id: profile.id,
          title: generateChatTitle(text),
        })
        .select()
        .single();

      if (error || !newChat) return;

      chatId = newChat.id;
      setChats((prev) => [newChat as Chat, ...prev]);
      setActiveChatId(chatId);
    }

    const { data: userMessage, error: userMessageError } = await supabase
      .from("messages")
      .insert({
        chat_id: chatId,
        role: "user",
        content: text,
      })
      .select()
      .single();

    if (userMessageError || !userMessage) return;

    const updatedMessages = [...messages, userMessage as Message];
    setMessages(updatedMessages);

    await supabase
      .from("chats")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", chatId);

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: updatedMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          stage: "intake",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "AI request failed");
      }

      const answer =
        result.answer ||
        (result.questions
          ? result.questions
              .map((q: { text?: string }) => q.text || "")
              .filter(Boolean)
              .join("\n\n")
          : "I couldn't generate a response.");

      const { data: assistantMessage, error: assistantError } = await supabase
        .from("messages")
        .insert({
          chat_id: chatId,
          role: "assistant",
          content: answer,
        })
        .select()
        .single();

      if (assistantError || !assistantMessage) {
        throw new Error("Failed to save AI response");
      }

      setMessages((prev) => [
        ...prev,
        assistantMessage as Message,
      ]);

      await supabase
        .from("chats")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", chatId);
    } catch (error) {
      console.error("JAI response error:", error);

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          chat_id: chatId!,
          role: "assistant",
          content:
            error instanceof Error
              ? `Sorry, I couldn't respond right now. ${error.message}`
              : "Sorry, I couldn't respond right now.",
          created_at: new Date().toISOString(),
        },
      ]);
    }
    }
