-- Migration: 20260518_remove_public_entry_reads.sql
-- Description: Remove anonymous SELECT access to attendance entries.

DROP POLICY IF EXISTS "Public can view entries for active sheets" ON public.musterentries;
