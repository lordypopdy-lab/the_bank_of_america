CREATE TABLE public.support_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.support_conversations TO authenticated;
GRANT ALL ON public.support_conversations TO service_role;
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own conversation" ON public.support_conversations FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('user','admin')),
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);
CREATE INDEX support_messages_conv_idx ON public.support_messages(conversation_id, created_at);
GRANT SELECT ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own messages" ON public.support_messages FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR EXISTS (
    SELECT 1 FROM public.support_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.clean_support_message(_m text) RETURNS text
LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE v text;
BEGIN
  v := btrim(regexp_replace(coalesce(_m,''), '[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', 'g'));
  IF v = '' THEN RAISE EXCEPTION 'Message cannot be empty'; END IF;
  IF length(v) > 2000 THEN RAISE EXCEPTION 'Message is too long (max 2000 characters)'; END IF;
  RETURN v;
END $$;

CREATE OR REPLACE FUNCTION public.send_support_message(_message text) RETURNS public.support_messages
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); cid uuid; r public.support_messages; v text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  v := public.clean_support_message(_message);
  INSERT INTO public.support_conversations(user_id) VALUES (uid)
    ON CONFLICT (user_id) DO UPDATE SET last_message_at = now() RETURNING id INTO cid;
  INSERT INTO public.support_messages(conversation_id, sender_id, sender_role, message)
    VALUES (cid, uid, 'user', v) RETURNING * INTO r;
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.admin_reply_support(_conversation uuid, _message text) RETURNS public.support_messages
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE aid uuid := public.assert_admin(); target uuid; r public.support_messages; v text;
BEGIN
  v := public.clean_support_message(_message);
  SELECT user_id INTO target FROM public.support_conversations WHERE id = _conversation;
  IF target IS NULL THEN RAISE EXCEPTION 'Conversation not found'; END IF;
  UPDATE public.support_conversations SET last_message_at = now() WHERE id = _conversation;
  INSERT INTO public.support_messages(conversation_id, sender_id, sender_role, message)
    VALUES (_conversation, aid, 'admin', v) RETURNING * INTO r;
  INSERT INTO public.notifications(user_id, title, message, type)
    VALUES (target, 'New support reply', left(v, 140), 'support');
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.mark_support_read(_conversation uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); owner uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT user_id INTO owner FROM public.support_conversations WHERE id = _conversation;
  IF owner IS NULL THEN RETURN; END IF;
  IF owner = uid THEN
    UPDATE public.support_messages SET read_at = now() WHERE conversation_id = _conversation AND sender_role = 'admin' AND read_at IS NULL;
  ELSIF public.has_role(uid, 'admin') THEN
    UPDATE public.support_messages SET read_at = now() WHERE conversation_id = _conversation AND sender_role = 'user' AND read_at IS NULL;
  ELSE RAISE EXCEPTION 'Not allowed'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.admin_support_conversations()
RETURNS TABLE(id uuid, user_id uuid, full_name text, email text, avatar_url text, last_message_at timestamptz, last_message text, last_sender text, unread bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.assert_admin();
  RETURN QUERY
  SELECT c.id, c.user_id, p.full_name, p.email, p.avatar_url, c.last_message_at,
    (SELECT m.message FROM public.support_messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1),
    (SELECT m.sender_role FROM public.support_messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1),
    (SELECT count(*) FROM public.support_messages m WHERE m.conversation_id = c.id AND m.sender_role = 'user' AND m.read_at IS NULL)
  FROM public.support_conversations c LEFT JOIN public.profiles p ON p.id = c.user_id
  ORDER BY c.last_message_at DESC;
END $$;

REVOKE EXECUTE ON FUNCTION public.send_support_message(text), public.admin_reply_support(uuid, text), public.mark_support_read(uuid), public.admin_support_conversations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_support_message(text), public.admin_reply_support(uuid, text), public.mark_support_read(uuid), public.admin_support_conversations() TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;