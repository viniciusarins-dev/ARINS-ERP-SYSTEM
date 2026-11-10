-- =====================================================================
-- ARMAG: carteira compartilhada entre os membros
--
-- Antes: cada usuário via só os registros que criou (owner_id = auth.uid()).
-- Agora: todo membro de armag.members vê e edita os mesmos clientes,
-- projetos, parcelas e pagamentos. owner_id continua sendo gravado e passa
-- a significar "quem cadastrou".
--
-- Quem não está em armag.members (ex.: usuários do ERP) continua sem acesso.
-- =====================================================================

drop policy clients_owner      on armag.clients;
drop policy projects_owner     on armag.projects;
drop policy installments_owner on armag.installments;
drop policy payments_owner     on armag.payments;

create policy clients_members on armag.clients for all to authenticated
  using ((select armag.is_member()))
  with check ((select armag.is_member()));

create policy projects_members on armag.projects for all to authenticated
  using ((select armag.is_member()))
  with check ((select armag.is_member()));

create policy installments_members on armag.installments for all to authenticated
  using ((select armag.is_member()))
  with check ((select armag.is_member()));

create policy payments_members on armag.payments for all to authenticated
  using ((select armag.is_member()))
  with check ((select armag.is_member()));

-- Membros enxergam a lista de membros (para exibir quem cadastrou).
drop policy members_self on armag.members;
create policy members_select on armag.members for select to authenticated
  using ((select armag.is_member()));
