ALTER TABLE public.support_messages ADD COLUMN IF NOT EXISTS deleted_at timestamptz, ADD COLUMN IF NOT EXISTS deleted_by uuid;

DROP POLICY IF EXISTS "own messages" ON public.support_messages;
CREATE POLICY "own messages" ON public.support_messages FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR (deleted_at IS NULL AND EXISTS (SELECT 1 FROM public.support_conversations c WHERE c.id = support_messages.conversation_id AND c.user_id = auth.uid())));

CREATE OR REPLACE FUNCTION public.delete_support_message(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE uid uuid := auth.uid(); m public.support_messages; owner uuid; is_admin boolean;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO m FROM public.support_messages WHERE id = _id FOR UPDATE;
  IF m.id IS NULL OR m.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'Message not found'; END IF;
  is_admin := public.has_role(uid, 'admin');
  IF NOT is_admin THEN
    SELECT user_id INTO owner FROM public.support_conversations WHERE id = m.conversation_id;
    IF owner IS DISTINCT FROM uid OR m.sender_id <> uid OR m.sender_role <> 'user' THEN
      RAISE EXCEPTION 'You can only delete your own messages';
    END IF;
  END IF;
  UPDATE public.support_messages SET deleted_at = now(), deleted_by = uid WHERE id = _id;
  IF is_admin THEN
    PERFORM public.log_admin(uid, 'support_message_deleted', (SELECT user_id FROM public.support_conversations WHERE id = m.conversation_id), left(m.message, 200), NULL, NULL);
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.delete_support_message(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_support_message(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_support_conversations()
 RETURNS TABLE(id uuid, user_id uuid, full_name text, email text, avatar_url text, last_message_at timestamp with time zone, last_message text, last_sender text, unread bigint)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.assert_admin();
  RETURN QUERY
  SELECT c.id, c.user_id, p.full_name, p.email, p.avatar_url, c.last_message_at,
    (SELECT m.message FROM public.support_messages m WHERE m.conversation_id = c.id AND m.deleted_at IS NULL ORDER BY m.created_at DESC LIMIT 1),
    (SELECT m.sender_role FROM public.support_messages m WHERE m.conversation_id = c.id AND m.deleted_at IS NULL ORDER BY m.created_at DESC LIMIT 1),
    (SELECT count(*) FROM public.support_messages m WHERE m.conversation_id = c.id AND m.sender_role = 'user' AND m.read_at IS NULL AND m.deleted_at IS NULL)
  FROM public.support_conversations c LEFT JOIN public.profiles p ON p.id = c.user_id
  ORDER BY c.last_message_at DESC;
END $function$;