CREATE OR REPLACE FUNCTION public.mark_support_read(_conversation uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE uid uuid := auth.uid(); owner uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT user_id INTO owner FROM public.support_conversations WHERE id = _conversation;
  IF owner IS NULL THEN RETURN; END IF;
  IF owner = uid THEN
    UPDATE public.support_messages SET read_at = now() WHERE conversation_id = _conversation AND sender_role = 'admin' AND read_at IS NULL;
    UPDATE public.notifications SET read = true WHERE user_id = uid AND type = 'support' AND read = false;
  ELSIF public.has_role(uid, 'admin') THEN
    UPDATE public.support_messages SET read_at = now() WHERE conversation_id = _conversation AND sender_role = 'user' AND read_at IS NULL;
  ELSE RAISE EXCEPTION 'Not allowed'; END IF;
END $function$;