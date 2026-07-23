--
-- PostgreSQL database dump
--

\restrict VFqWaqNcJbTwEjMWomfmJzOiIPmyAv59HuclNLymVLrOe5DEszdN8vuh0AxcX19

-- Dumped from database version 16.14 (Debian 16.14-1.pgdg13+1)
-- Dumped by pg_dump version 16.14 (Debian 16.14-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: origemreclamacao; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.origemreclamacao AS ENUM (
    'reclame_aqui',
    'atendimento_interno',
    'redes_sociais',
    'email',
    'telefone'
);


ALTER TYPE public.origemreclamacao OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


ALTER TABLE public.alembic_version OWNER TO postgres;

--
-- Name: attachments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.attachments (
    id integer NOT NULL,
    ticket_id uuid,
    file_url character varying(500) NOT NULL,
    file_type character varying(50),
    uploaded_at timestamp with time zone DEFAULT now(),
    original_name character varying(255)
);


ALTER TABLE public.attachments OWNER TO postgres;

--
-- Name: attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.attachments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.attachments_id_seq OWNER TO postgres;

--
-- Name: attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.attachments_id_seq OWNED BY public.attachments.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    autor_id integer,
    autor_nome character varying(120),
    acao character varying(40) NOT NULL,
    entidade character varying(40) NOT NULL,
    descricao text NOT NULL,
    criado_em timestamp with time zone DEFAULT now()
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_id_seq OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: categorias_gasto; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categorias_gasto (
    id integer NOT NULL,
    name character varying(80) NOT NULL,
    active integer DEFAULT 1 NOT NULL
);


ALTER TABLE public.categorias_gasto OWNER TO postgres;

--
-- Name: categorias_gasto_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.categorias_gasto_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categorias_gasto_id_seq OWNER TO postgres;

--
-- Name: categorias_gasto_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.categorias_gasto_id_seq OWNED BY public.categorias_gasto.id;


--
-- Name: checklist_componentes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.checklist_componentes (
    id integer NOT NULL,
    name character varying(160) NOT NULL,
    active integer DEFAULT 1 NOT NULL,
    ordem integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.checklist_componentes OWNER TO postgres;

--
-- Name: checklist_componentes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.checklist_componentes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.checklist_componentes_id_seq OWNER TO postgres;

--
-- Name: checklist_componentes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.checklist_componentes_id_seq OWNED BY public.checklist_componentes.id;


--
-- Name: columns; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.columns (
    id integer NOT NULL,
    name character varying(120) NOT NULL,
    order_index integer DEFAULT 0 NOT NULL,
    sla_hours integer,
    is_waiting_client integer DEFAULT 0,
    is_done integer DEFAULT 0,
    is_received integer DEFAULT 0
);


ALTER TABLE public.columns OWNER TO postgres;

--
-- Name: columns_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.columns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.columns_id_seq OWNER TO postgres;

--
-- Name: columns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.columns_id_seq OWNED BY public.columns.id;


--
-- Name: compras; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.compras (
    id integer NOT NULL,
    data_compra date,
    responsavel_compra character varying(120),
    fornecedor character varying(160),
    contato_fornecedor character varying(200),
    marca character varying(120),
    modelo character varying(160),
    numero_serie character varying(120),
    nota_fiscal character varying(80),
    data_entrega date,
    status_compra character varying(80),
    criado_em timestamp with time zone DEFAULT now()
);


ALTER TABLE public.compras OWNER TO postgres;

--
-- Name: compras_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.compras_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.compras_id_seq OWNER TO postgres;

--
-- Name: compras_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.compras_id_seq OWNED BY public.compras.id;


--
-- Name: defect_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.defect_types (
    id integer NOT NULL,
    name character varying(120) NOT NULL,
    active integer DEFAULT 1
);


ALTER TABLE public.defect_types OWNER TO postgres;

--
-- Name: defect_types_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.defect_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.defect_types_id_seq OWNER TO postgres;

--
-- Name: defect_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.defect_types_id_seq OWNED BY public.defect_types.id;


--
-- Name: desfechos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.desfechos (
    id integer NOT NULL,
    name character varying(120) NOT NULL,
    impacto character varying(20) DEFAULT 'sem_prejuizo'::character varying NOT NULL,
    active integer DEFAULT 1
);


ALTER TABLE public.desfechos OWNER TO postgres;

--
-- Name: desfechos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.desfechos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.desfechos_id_seq OWNER TO postgres;

--
-- Name: desfechos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.desfechos_id_seq OWNED BY public.desfechos.id;


--
-- Name: estados_retida; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.estados_retida (
    id integer NOT NULL,
    name character varying(80) NOT NULL,
    active integer DEFAULT 1 NOT NULL,
    ordem integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.estados_retida OWNER TO postgres;

--
-- Name: estados_retida_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.estados_retida_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.estados_retida_id_seq OWNER TO postgres;

--
-- Name: estados_retida_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.estados_retida_id_seq OWNED BY public.estados_retida.id;


--
-- Name: gastos_ticket; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.gastos_ticket (
    id integer NOT NULL,
    ticket_id uuid NOT NULL,
    categoria_id integer,
    valor numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    descricao character varying(300),
    criado_em timestamp with time zone DEFAULT now()
);


ALTER TABLE public.gastos_ticket OWNER TO postgres;

--
-- Name: gastos_ticket_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.gastos_ticket_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.gastos_ticket_id_seq OWNER TO postgres;

--
-- Name: gastos_ticket_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.gastos_ticket_id_seq OWNED BY public.gastos_ticket.id;


--
-- Name: impressoras_retidas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.impressoras_retidas (
    id integer NOT NULL,
    ticket_id uuid,
    marca character varying(120),
    modelo character varying(160),
    numero_serie character varying(120),
    condicao character varying(200),
    estado_id integer,
    local character varying(160),
    observacao text,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now()
);


ALTER TABLE public.impressoras_retidas OWNER TO postgres;

--
-- Name: impressoras_retidas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.impressoras_retidas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.impressoras_retidas_id_seq OWNER TO postgres;

--
-- Name: impressoras_retidas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.impressoras_retidas_id_seq OWNED BY public.impressoras_retidas.id;


--
-- Name: kb_artigos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.kb_artigos (
    id integer NOT NULL,
    titulo character varying(200) NOT NULL,
    categoria character varying(80),
    problema text,
    resolucao text,
    pitches json DEFAULT '[]'::json NOT NULL,
    pitches_texto text,
    autor_id integer,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now(),
    favorito integer DEFAULT 0 NOT NULL,
    resolucao_anterior text,
    resolucao_historico json
);


ALTER TABLE public.kb_artigos OWNER TO postgres;

--
-- Name: kb_artigos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.kb_artigos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.kb_artigos_id_seq OWNER TO postgres;

--
-- Name: kb_artigos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.kb_artigos_id_seq OWNED BY public.kb_artigos.id;


--
-- Name: modelo_checklist; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.modelo_checklist (
    id integer NOT NULL,
    modelo_id integer NOT NULL,
    componente_id integer NOT NULL,
    ordem integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.modelo_checklist OWNER TO postgres;

--
-- Name: modelo_checklist_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.modelo_checklist_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.modelo_checklist_id_seq OWNER TO postgres;

--
-- Name: modelo_checklist_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.modelo_checklist_id_seq OWNED BY public.modelo_checklist.id;


--
-- Name: pecas_padrao; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pecas_padrao (
    id integer NOT NULL,
    name character varying(120) NOT NULL,
    active integer DEFAULT 1 NOT NULL,
    ordem integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.pecas_padrao OWNER TO postgres;

--
-- Name: pecas_padrao_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pecas_padrao_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pecas_padrao_id_seq OWNER TO postgres;

--
-- Name: pecas_padrao_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pecas_padrao_id_seq OWNED BY public.pecas_padrao.id;


--
-- Name: printer_brands; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.printer_brands (
    id integer NOT NULL,
    name character varying(120) NOT NULL,
    active integer DEFAULT 1
);


ALTER TABLE public.printer_brands OWNER TO postgres;

--
-- Name: printer_brands_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.printer_brands_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.printer_brands_id_seq OWNER TO postgres;

--
-- Name: printer_brands_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.printer_brands_id_seq OWNED BY public.printer_brands.id;


--
-- Name: printer_models; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.printer_models (
    id integer NOT NULL,
    brand_id integer NOT NULL,
    name character varying(120) NOT NULL,
    sku character varying(60),
    current_price numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    active integer DEFAULT 1
);


ALTER TABLE public.printer_models OWNER TO postgres;

--
-- Name: printer_models_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.printer_models_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.printer_models_id_seq OWNER TO postgres;

--
-- Name: printer_models_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.printer_models_id_seq OWNED BY public.printer_models.id;


--
-- Name: recebimento_checklist; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.recebimento_checklist (
    id integer NOT NULL,
    recebimento_id integer NOT NULL,
    componente_nome character varying(160) NOT NULL,
    estado character varying(40) NOT NULL,
    comentario text,
    criado_em timestamp with time zone DEFAULT now()
);


ALTER TABLE public.recebimento_checklist OWNER TO postgres;

--
-- Name: recebimento_checklist_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.recebimento_checklist_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.recebimento_checklist_id_seq OWNER TO postgres;

--
-- Name: recebimento_checklist_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.recebimento_checklist_id_seq OWNED BY public.recebimento_checklist.id;


--
-- Name: recebimentos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.recebimentos (
    id integer NOT NULL,
    ticket_id uuid NOT NULL,
    data_recebimento date NOT NULL,
    numero_nf character varying(60),
    quantidade integer DEFAULT 1 NOT NULL,
    condicao character varying(60) NOT NULL,
    observacao text,
    criado_por_id integer
);


ALTER TABLE public.recebimentos OWNER TO postgres;

--
-- Name: recebimentos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.recebimentos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.recebimentos_id_seq OWNER TO postgres;

--
-- Name: recebimentos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.recebimentos_id_seq OWNED BY public.recebimentos.id;


--
-- Name: retida_historico; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.retida_historico (
    id integer NOT NULL,
    retida_id integer NOT NULL,
    estado_de character varying(80),
    estado_para character varying(80),
    local character varying(160),
    nota text,
    autor_id integer,
    criado_em timestamp with time zone DEFAULT now()
);


ALTER TABLE public.retida_historico OWNER TO postgres;

--
-- Name: retida_historico_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.retida_historico_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.retida_historico_id_seq OWNER TO postgres;

--
-- Name: retida_historico_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.retida_historico_id_seq OWNED BY public.retida_historico.id;


--
-- Name: retida_notas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.retida_notas (
    id integer NOT NULL,
    retida_id integer NOT NULL,
    texto text NOT NULL,
    autor_id integer,
    criado_em timestamp with time zone DEFAULT now()
);


ALTER TABLE public.retida_notas OWNER TO postgres;

--
-- Name: retida_notas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.retida_notas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.retida_notas_id_seq OWNER TO postgres;

--
-- Name: retida_notas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.retida_notas_id_seq OWNED BY public.retida_notas.id;


--
-- Name: retida_pecas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.retida_pecas (
    id integer NOT NULL,
    retida_id integer NOT NULL,
    peca character varying(200) NOT NULL,
    destino_texto character varying(300),
    destino_retida_id integer,
    autor_id integer,
    criado_em timestamp with time zone DEFAULT now(),
    destino_ticket_id uuid
);


ALTER TABLE public.retida_pecas OWNER TO postgres;

--
-- Name: retida_pecas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.retida_pecas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.retida_pecas_id_seq OWNER TO postgres;

--
-- Name: retida_pecas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.retida_pecas_id_seq OWNED BY public.retida_pecas.id;


--
-- Name: status_tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.status_tags (
    id integer NOT NULL,
    name character varying(60) NOT NULL,
    color character varying(7) DEFAULT '#999999'::character varying
);


ALTER TABLE public.status_tags OWNER TO postgres;

--
-- Name: status_tags_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.status_tags_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.status_tags_id_seq OWNER TO postgres;

--
-- Name: status_tags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.status_tags_id_seq OWNED BY public.status_tags.id;


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.suppliers (
    id integer NOT NULL,
    name character varying(120) NOT NULL,
    active integer DEFAULT 1
);


ALTER TABLE public.suppliers OWNER TO postgres;

--
-- Name: suppliers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.suppliers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.suppliers_id_seq OWNER TO postgres;

--
-- Name: suppliers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.suppliers_id_seq OWNED BY public.suppliers.id;


--
-- Name: ticket_eventos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ticket_eventos (
    id integer NOT NULL,
    ticket_id uuid NOT NULL,
    tipo character varying(20) DEFAULT 'comentario'::character varying NOT NULL,
    texto text NOT NULL,
    autor_id integer,
    criado_em timestamp with time zone DEFAULT now()
);


ALTER TABLE public.ticket_eventos OWNER TO postgres;

--
-- Name: ticket_eventos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ticket_eventos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ticket_eventos_id_seq OWNER TO postgres;

--
-- Name: ticket_eventos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ticket_eventos_id_seq OWNED BY public.ticket_eventos.id;


--
-- Name: ticket_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ticket_history (
    id integer NOT NULL,
    ticket_id uuid,
    from_column_id integer,
    to_column_id integer NOT NULL,
    moved_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.ticket_history OWNER TO postgres;

--
-- Name: ticket_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ticket_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ticket_history_id_seq OWNER TO postgres;

--
-- Name: ticket_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ticket_history_id_seq OWNED BY public.ticket_history.id;


--
-- Name: ticket_tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ticket_tags (
    ticket_id uuid NOT NULL,
    tag_id integer NOT NULL
);


ALTER TABLE public.ticket_tags OWNER TO postgres;

--
-- Name: tickets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tickets (
    id uuid NOT NULL,
    titulo character varying(255) NOT NULL,
    problema text NOT NULL,
    numero_nf character varying(60),
    notas text,
    origem public.origemreclamacao NOT NULL,
    codigo_rastreio character varying(120),
    requer_contato_cliente integer DEFAULT 0,
    retorno_horas integer,
    retorno_definido_em timestamp with time zone,
    printer_model_id integer NOT NULL,
    serial_number character varying(120),
    quantidade integer DEFAULT 1 NOT NULL,
    custo_unitario numeric(10,2) NOT NULL,
    column_id integer NOT NULL,
    order_index integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone,
    last_moved_at timestamp with time zone DEFAULT now(),
    supplier_id integer,
    defect_type_id integer,
    codigo_interno character varying(20),
    responsavel_id integer,
    desfecho_id integer,
    prejuizo_real numeric(10,2),
    ticket_suporte_externo character varying(120),
    faixa_prazo character varying(10)
);


ALTER TABLE public.tickets OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(80) NOT NULL,
    nome character varying(120),
    password_hash character varying(255) NOT NULL,
    role character varying(20) DEFAULT 'atendente'::character varying NOT NULL,
    active integer DEFAULT 1
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: attachments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attachments ALTER COLUMN id SET DEFAULT nextval('public.attachments_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: categorias_gasto id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categorias_gasto ALTER COLUMN id SET DEFAULT nextval('public.categorias_gasto_id_seq'::regclass);


--
-- Name: checklist_componentes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.checklist_componentes ALTER COLUMN id SET DEFAULT nextval('public.checklist_componentes_id_seq'::regclass);


--
-- Name: columns id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.columns ALTER COLUMN id SET DEFAULT nextval('public.columns_id_seq'::regclass);


--
-- Name: compras id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.compras ALTER COLUMN id SET DEFAULT nextval('public.compras_id_seq'::regclass);


--
-- Name: defect_types id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.defect_types ALTER COLUMN id SET DEFAULT nextval('public.defect_types_id_seq'::regclass);


--
-- Name: desfechos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.desfechos ALTER COLUMN id SET DEFAULT nextval('public.desfechos_id_seq'::regclass);


--
-- Name: estados_retida id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.estados_retida ALTER COLUMN id SET DEFAULT nextval('public.estados_retida_id_seq'::regclass);


--
-- Name: gastos_ticket id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gastos_ticket ALTER COLUMN id SET DEFAULT nextval('public.gastos_ticket_id_seq'::regclass);


--
-- Name: impressoras_retidas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.impressoras_retidas ALTER COLUMN id SET DEFAULT nextval('public.impressoras_retidas_id_seq'::regclass);


--
-- Name: kb_artigos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kb_artigos ALTER COLUMN id SET DEFAULT nextval('public.kb_artigos_id_seq'::regclass);


--
-- Name: modelo_checklist id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.modelo_checklist ALTER COLUMN id SET DEFAULT nextval('public.modelo_checklist_id_seq'::regclass);


--
-- Name: pecas_padrao id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pecas_padrao ALTER COLUMN id SET DEFAULT nextval('public.pecas_padrao_id_seq'::regclass);


--
-- Name: printer_brands id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.printer_brands ALTER COLUMN id SET DEFAULT nextval('public.printer_brands_id_seq'::regclass);


--
-- Name: printer_models id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.printer_models ALTER COLUMN id SET DEFAULT nextval('public.printer_models_id_seq'::regclass);


--
-- Name: recebimento_checklist id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recebimento_checklist ALTER COLUMN id SET DEFAULT nextval('public.recebimento_checklist_id_seq'::regclass);


--
-- Name: recebimentos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recebimentos ALTER COLUMN id SET DEFAULT nextval('public.recebimentos_id_seq'::regclass);


--
-- Name: retida_historico id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.retida_historico ALTER COLUMN id SET DEFAULT nextval('public.retida_historico_id_seq'::regclass);


--
-- Name: retida_notas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.retida_notas ALTER COLUMN id SET DEFAULT nextval('public.retida_notas_id_seq'::regclass);


--
-- Name: retida_pecas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.retida_pecas ALTER COLUMN id SET DEFAULT nextval('public.retida_pecas_id_seq'::regclass);


--
-- Name: status_tags id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.status_tags ALTER COLUMN id SET DEFAULT nextval('public.status_tags_id_seq'::regclass);


--
-- Name: suppliers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers ALTER COLUMN id SET DEFAULT nextval('public.suppliers_id_seq'::regclass);


--
-- Name: ticket_eventos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_eventos ALTER COLUMN id SET DEFAULT nextval('public.ticket_eventos_id_seq'::regclass);


--
-- Name: ticket_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_history ALTER COLUMN id SET DEFAULT nextval('public.ticket_history_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.alembic_version (version_num) FROM stdin;
0023_modelos_checklist
\.


--
-- Data for Name: attachments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.attachments (id, ticket_id, file_url, file_type, uploaded_at, original_name) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, autor_id, autor_nome, acao, entidade, descricao, criado_em) FROM stdin;
1	1	Administrador	login	sessao	Login de "admin".	2026-06-30 13:19:50.413884+00
2	1	Administrador	criar	catalogo	Criou em suppliers: "3D TOUCH".	2026-06-30 13:26:20.321741+00
3	1	Administrador	criar	catalogo	Criou em suppliers: "KARIMEX".	2026-06-30 13:26:30.93705+00
4	1	Administrador	criar	catalogo	Criou em suppliers: "PAUTA".	2026-06-30 13:26:43.944042+00
5	1	Administrador	criar	catalogo	Criou em defect-types: "Bico Entupido (Nozzle Clog)".	2026-06-30 13:30:01.133083+00
6	1	Administrador	criar	catalogo	Criou em defect-types: "Extrusor Travado (Extruder Jam)".	2026-06-30 13:30:10.315893+00
7	1	Administrador	criar	catalogo	Criou em defect-types: "Subextrus├úo (Under-extrusion)".	2026-06-30 13:30:17.310216+00
8	1	Administrador	criar	catalogo	Criou em defect-types: "Superextrus├úo (Over-extrusion)".	2026-06-30 13:30:28.167369+00
9	1	Administrador	criar	catalogo	Criou em defect-types: "Pe├ºa Descolando da Mesa (Falta de Ades├úo)".	2026-06-30 13:30:35.620917+00
10	1	Administrador	criar	catalogo	Criou em defect-types: "Efeito "Warping" (Empenamento)".	2026-06-30 13:30:42.513058+00
11	1	Administrador	criar	catalogo	Criou em defect-types: "Primeira Camada Muito Pr├│xima/Longe".	2026-06-30 13:30:51.979952+00
12	1	Administrador	criar	catalogo	Criou em defect-types: "Fios na Pe├ºa (Stringing / Oozing)".	2026-06-30 13:31:00.97676+00
13	1	Administrador	criar	catalogo	Criou em defect-types: "Cicatrizes e Costura Vis├¡vel (Seam Lines)".	2026-06-30 13:31:06.527348+00
14	1	Administrador	criar	catalogo	Criou em defect-types: "Linhas de Camada Inconsistentes (Banding / Z-Wobble)".	2026-06-30 13:31:13.011485+00
15	1	Administrador	criar	catalogo	Criou em defect-types: "Deslocamento de Camada (Layer Shift)".	2026-06-30 13:31:18.340624+00
16	1	Administrador	criar	catalogo	Criou em defect-types: "Filamento ├Ümido".	2026-06-30 13:31:29.067974+00
17	1	Administrador	criar	catalogo	Criou em defect-types: "Filamento Preso no Carretel (N├│)".	2026-06-30 13:31:45.193699+00
18	1	Administrador	criar	catalogo	Criou em defect-types: "Erro de Retra├º├úo / Quebra no Tubo PTFE".	2026-06-30 13:31:51.751608+00
19	1	Administrador	criar	catalogo	Criou em defect-types: "Erro de Temperatura (Thermal Runaway)".	2026-06-30 13:31:57.361785+00
20	1	Administrador	criar	catalogo	Criou em defect-types: "Falha de Nivelamento Autom├ítico (Auto-leveling Error)".	2026-06-30 13:32:02.68604+00
21	1	Administrador	criar	catalogo	Criou em defect-types: "Resson├óncia / Vibra├º├úo".	2026-06-30 13:32:09.623686+00
22	1	Administrador	criar	desfecho	Criou o desfecho "Reparo Feito" (impacto: sem_prejuizo).	2026-06-30 13:33:08.776724+00
23	1	Administrador	criar	desfecho	Criou o desfecho "Troca de Pe├ºa" (impacto: parcial).	2026-06-30 13:33:16.431957+00
24	1	Administrador	criar	desfecho	Criou o desfecho "Frete" (impacto: parcial).	2026-06-30 13:33:40.22739+00
25	1	Administrador	editar	desfecho	Editou o desfecho "Troca de Pe├ºa" (impacto: parcial).	2026-06-30 13:34:05.073169+00
26	1	Administrador	excluir	desfecho	Excluiu o desfecho "Troca de Pe├ºa".	2026-06-30 13:34:08.750691+00
27	1	Administrador	criar	desfecho	Criou o desfecho "Troca de Componente Garantia" (impacto: sem_prejuizo).	2026-06-30 13:34:32.372001+00
28	1	Administrador	criar	desfecho	Criou o desfecho "Troca de Componente PAGO" (impacto: parcial).	2026-06-30 13:34:47.490147+00
29	1	Administrador	criar	desfecho	Criou o desfecho "Somente Ajuste T├®cnico" (impacto: sem_prejuizo).	2026-06-30 13:36:05.124054+00
30	1	Administrador	criar	desfecho	Criou o desfecho "Apenas Contato Fiscal" (impacto: sem_prejuizo).	2026-06-30 13:39:06.163569+00
31	1	Administrador	criar	desfecho	Criou o desfecho "Gastos Durante Atendimento" (impacto: parcial).	2026-06-30 13:40:02.750701+00
32	1	Administrador	criar	desfecho	Criou o desfecho "Perda do Equipamento" (impacto: total).	2026-06-30 13:40:14.074334+00
33	1	Administrador	criar	usuario	Criou o usu├írio "stlflix.tom@gmail.com" (papel: admin).	2026-06-30 13:40:48.625906+00
34	1	Administrador	login	sessao	Login de "admin".	2026-06-30 13:57:38.776865+00
35	1	Administrador	login	sessao	Login de "admin".	2026-06-30 14:05:17.611006+00
36	2	Tom	login	sessao	Login de "stlflix.tom@gmail.com".	2026-06-30 14:35:46.083842+00
37	1	Administrador	login	sessao	Login de "admin".	2026-06-30 14:45:40.001245+00
38	1	Administrador	login	sessao	Login de "admin".	2026-06-30 14:46:23.863709+00
39	1	Administrador	login	sessao	Login de "admin".	2026-06-30 14:46:28.496923+00
40	1	Administrador	login	sessao	Login de "admin".	2026-06-30 15:02:23.666469+00
41	1	Administrador	login	sessao	Login de "admin".	2026-06-30 15:03:00.28651+00
42	1	Administrador	login	sessao	Login de "admin".	2026-06-30 15:03:04.629319+00
43	1	Administrador	login	sessao	Login de "admin".	2026-06-30 15:25:37.681615+00
44	1	Administrador	criar	ticket	Criou o ticket GAR-2026-0001 ÔÇö "Andr├® - Bico Entupido".	2026-06-30 15:42:27.567544+00
45	1	Administrador	login	sessao	Login de "admin".	2026-06-30 17:10:16.960395+00
46	1	Administrador	criar	ticket	Criou o ticket GAR-2026-0002 ÔÇö "Lucas".	2026-06-30 17:43:38.401217+00
47	1	Administrador	mover	ticket	Moveu o ticket GAR-2026-0001 para "AN├üLISE INTERNA".	2026-06-30 17:44:54.635129+00
48	1	Administrador	criar	recebimento	Registrou recebimento do ticket GAR-2026-0001 (1 un., "Conforme esperado").	2026-06-30 17:46:15.188452+00
49	1	Administrador	mover	ticket	Moveu o ticket GAR-2026-0001 para "RECEBIMENTOS".	2026-06-30 17:47:50.832375+00
50	1	Administrador	editar	ticket	Editou o ticket GAR-2026-0002.	2026-06-30 18:47:27.135166+00
51	1	Administrador	mover	ticket	Moveu o ticket GAR-2026-0002 para "AN├üLISE INTERNA".	2026-06-30 19:57:56.483288+00
52	1	Administrador	mover	ticket	Moveu o ticket GAR-2026-0002 para "3D TOUCH SN".	2026-06-30 19:57:57.58223+00
53	1	Administrador	login	sessao	Login de "admin".	2026-07-01 12:52:51.824588+00
54	1	Administrador	login	sessao	Login de "admin".	2026-07-01 16:46:55.825962+00
55	1	Administrador	mover	ticket	Moveu o ticket GAR-2026-0002 para "TICKET 3D TOUCH".	2026-07-01 18:44:52.552703+00
56	1	Administrador	mover	ticket	Moveu o ticket GAR-2026-0002 para "3D TOUCH SN".	2026-07-01 18:45:48.155187+00
57	1	Administrador	mover	ticket	Moveu o ticket GAR-2026-0002 para "TICKET BAMBU LAB".	2026-07-01 18:45:50.882909+00
58	1	Administrador	mover	ticket	Moveu o ticket GAR-2026-0002 para "AGUARDANDO ENVIO DO CLIENTE".	2026-07-01 18:46:17.237977+00
59	1	Administrador	mover	ticket	Moveu o ticket GAR-2026-0002 para "RECEBIMENTOS".	2026-07-01 18:46:22.055611+00
60	1	Administrador	criar	recebimento	Registrou recebimento do ticket GAR-2026-0001 (1 un., "Outro").	2026-07-01 18:47:32.034811+00
61	1	Administrador	mover	ticket	Moveu o ticket GAR-2026-0002 para "AN├üLISE DE EQUIPAMENTO".	2026-07-01 18:48:07.719483+00
62	1	Administrador	mover	ticket	Moveu o ticket GAR-2026-0002 para "ENVIO PARA O CLIENTE".	2026-07-01 18:48:43.221006+00
63	1	Administrador	editar	ticket	Editou o ticket GAR-2026-0002.	2026-07-01 18:50:20.989474+00
64	1	Administrador	editar	ticket	Editou o ticket GAR-2026-0002.	2026-07-01 18:50:25.970667+00
65	1	Administrador	mover	ticket	Moveu o ticket GAR-2026-0002 para "CONCLU├ìDO".	2026-07-01 18:51:25.422499+00
66	1	Administrador	editar	ticket	Editou o ticket GAR-2026-0002.	2026-07-01 18:53:14.139955+00
67	2	Tom	login	sessao	Login de "stlflix.tom@gmail.com".	2026-07-01 18:59:06.645936+00
68	2	Tom	editar	ticket	Editou o ticket GAR-2026-0001.	2026-07-01 19:00:15.450803+00
69	2	Tom	editar	ticket	Editou o ticket GAR-2026-0001.	2026-07-01 19:02:20.574921+00
70	1	Administrador	login	sessao	Login de "admin".	2026-07-06 12:50:11.011888+00
71	1	Administrador	criar	compra	Importou 60 compra(s) em massa.	2026-07-06 12:51:05.603738+00
72	1	Administrador	editar	catalogo	Renomeou em suppliers: "3D TOUCH" ÔåÆ "3D Touch".	2026-07-06 13:05:04.913277+00
73	1	Administrador	editar	desfecho	Editou o desfecho "Apenas Contato Fiscal" (impacto: informativo).	2026-07-06 13:27:14.275568+00
74	1	Administrador	editar	desfecho	Editou o desfecho "Somente Ajuste T├®cnico" (impacto: informativo).	2026-07-06 13:27:26.231805+00
75	1	Administrador	editar	desfecho	Editou o desfecho "Reparo Feito" (impacto: sem_prejuizo).	2026-07-06 13:27:41.241549+00
76	1	Administrador	editar	desfecho	Editou o desfecho "asdfReparo Feito" (impacto: sem_prejuizo).	2026-07-06 13:27:54.778539+00
77	1	Administrador	criar	ticket	Criou o ticket GAR-2026-0003 ÔÇö "TESTE RECEBIMENTOS".	2026-07-06 13:50:14.745324+00
78	1	Administrador	mover	ticket	Moveu o ticket GAR-2026-0003 para "RECEBIMENTOS".	2026-07-06 13:50:28.462874+00
79	1	Administrador	criar	recebimento	Registrou recebimento do ticket GAR-2026-0003 (1 un., "Conforme esperado").	2026-07-06 13:51:10.266456+00
80	1	Administrador	editar	ticket	Editou o ticket GAR-2026-0003.	2026-07-06 13:52:21.47793+00
81	1	Administrador	mover	ticket	Moveu o ticket GAR-2026-0003 para "CONCLU├ìDO".	2026-07-06 13:52:27.934942+00
82	1	Administrador	criar	ticket	Criou o ticket GAR-2026-0004 ÔÇö "TESTE".	2026-07-06 13:53:01.422445+00
83	1	Administrador	editar	ticket	Editou o ticket GAR-2026-0004.	2026-07-06 13:53:10.258481+00
84	1	Administrador	mover	ticket	Moveu o ticket GAR-2026-0004 para "CONCLU├ìDO".	2026-07-06 13:53:13.219721+00
85	1	Administrador	editar	desfecho	Editou o desfecho "asdfReparo Feito" (impacto: sem_prejuizo).	2026-07-06 14:15:30.689652+00
86	1	Administrador	editar	desfecho	Editou o desfecho "Apenas Contato Fiscal" (impacto: informativo).	2026-07-06 14:18:30.776717+00
87	1	Administrador	editar	desfecho	Editou o desfecho "Apenas Contato Fiscal" (impacto: informativo).	2026-07-06 14:20:58.165871+00
88	1	Administrador	criar	ticket	Criou o ticket GAR-2026-0005 ÔÇö "teste de movimento".	2026-07-06 18:51:03.500726+00
89	1	Administrador	mover	ticket	Moveu o ticket GAR-2026-0005 para "AN├üLISE INTERNA".	2026-07-06 18:51:18.208123+00
90	1	Administrador	login	sessao	Login de "admin".	2026-07-07 18:45:21.85562+00
91	1	Administrador	editar	ticket	Editou o ticket GAR-2026-0005.	2026-07-07 19:44:12.422736+00
92	1	Administrador	login	sessao	Login de "admin".	2026-07-14 12:20:13.476619+00
93	1	Administrador	criar	kb	Criou o material "problema no hotend".	2026-07-14 12:43:07.38674+00
94	1	Administrador	mover	ticket	Moveu o ticket GAR-2026-0005 para "3D TOUCH SN".	2026-07-14 12:43:25.048653+00
95	1	Administrador	mover	ticket	Moveu o ticket GAR-2026-0005 para "TICKET 3D TOUCH".	2026-07-14 12:43:26.464636+00
96	1	Administrador	criar	ticket	Criou o ticket GAR-2026-0006 ÔÇö "asdfasdf".	2026-07-14 12:47:25.202685+00
97	1	Administrador	login	sessao	Login de "admin".	2026-07-14 12:49:28.607975+00
98	1	Administrador	editar	ticket	Editou o ticket GAR-2026-0006.	2026-07-14 12:49:42.480567+00
99	1	Administrador	editar	ticket	Editou o ticket GAR-2026-0006.	2026-07-14 12:50:07.9399+00
100	1	Administrador	editar	ticket	Registrou contato com o cliente no ticket GAR-2026-0006.	2026-07-14 12:50:38.109228+00
101	1	Administrador	login	sessao	Login de "admin".	2026-07-15 16:16:03.718027+00
102	1	Administrador	editar	ticket	Editou o ticket GAR-2026-0006.	2026-07-15 16:16:26.587839+00
103	1	Administrador	mover	ticket	Moveu o ticket GAR-2026-0006 para "CONCLU├ìDO".	2026-07-15 16:16:29.587162+00
104	1	Administrador	editar	ticket	Editou o ticket GAR-2026-0005.	2026-07-15 16:16:38.157892+00
105	1	Administrador	mover	ticket	Moveu o ticket GAR-2026-0005 para "CONCLU├ìDO".	2026-07-15 16:16:40.702032+00
106	1	Administrador	editar	ticket	Editou o ticket GAR-2026-0001.	2026-07-15 16:16:51.284736+00
107	1	Administrador	mover	ticket	Moveu o ticket GAR-2026-0001 para "CONCLU├ìDO".	2026-07-15 16:16:53.692322+00
108	1	Administrador	criar	kb	Criou o material "POL├ìTICA DE GARANTIA E ASSIST├èNCIA T├ëCNICA".	2026-07-15 19:47:00.56322+00
109	1	Administrador	editar	kb	Editou o material "POL├ìTICA DE GARANTIA E ASSIST├èNCIA T├ëCNICA".	2026-07-15 19:52:07.438152+00
110	1	Administrador	login	sessao	Login de "admin".	2026-07-16 12:19:11.300447+00
111	1	Administrador	login	sessao	Login de "admin".	2026-07-20 12:55:24.816442+00
112	1	Administrador	criar	ticket	Criou o ticket GAR-2026-0001 ÔÇö "Teste Impressora retida".	2026-07-20 14:21:36.907761+00
113	1	Administrador	criar	retida	Cadastrou impressora retida (SN: 100100).	2026-07-20 14:28:40.3626+00
114	1	Administrador	editar	retida	Registrou pe├ºa "PLACA AC" retirada da retida #1.	2026-07-20 14:29:18.391209+00
115	1	Administrador	editar	retida	Registrou pe├ºa "Hotend" retirada da retida #1.	2026-07-20 14:29:33.33353+00
116	1	Administrador	editar	retida	Mudou o estado da retida #1 para "Cemit├®rio de pe├ºas".	2026-07-20 14:29:52.483425+00
117	1	Administrador	criar	retida	Cadastrou impressora retida (SN: 100100).	2026-07-20 14:55:35.830246+00
118	1	Administrador	editar	retida	Registrou pe├ºa "Bico" retirada da retida #1.	2026-07-20 14:56:22.641068+00
119	1	Administrador	login	sessao	Login de "admin".	2026-07-20 16:31:58.88649+00
120	1	Administrador	login	sessao	Login de "admin".	2026-07-20 16:32:27.006555+00
121	1	Administrador	login	sessao	Login de "admin".	2026-07-20 16:33:05.00544+00
122	1	Administrador	login	sessao	Login de "admin".	2026-07-20 16:33:25.757725+00
123	1	Administrador	login	sessao	Login de "admin".	2026-07-20 16:39:28.140071+00
124	1	Administrador	login	sessao	Login de "admin".	2026-07-20 16:43:30.920024+00
125	1	Administrador	login	sessao	Login de "admin".	2026-07-20 16:46:49.203887+00
126	1	Administrador	login	sessao	Login de "admin".	2026-07-20 16:47:20.040622+00
127	1	Administrador	login	sessao	Login de "admin".	2026-07-20 16:47:39.205319+00
128	1	Administrador	editar	retida	Registrou pe├ºa "Cabo flat" retirada da retida #2.	2026-07-20 18:38:27.767628+00
129	1	Administrador	editar	retida	Registrou pe├ºa "Sensor" retirada da retida #2.	2026-07-20 18:38:49.955801+00
130	1	Administrador	editar	retida	Registrou pe├ºa "Polia / engrenagem" retirada da retida #2.	2026-07-20 18:51:23.191588+00
131	1	Administrador	editar	retida	Mudou o estado da retida #2 para "Cemit├®rio de pe├ºas".	2026-07-20 18:51:48.407361+00
132	1	Administrador	login	sessao	Login de "admin".	2026-07-20 18:59:53.621512+00
133	1	Administrador	editar	retida	Registrou pe├ºa "Cabos internos" retirada da retida #2.	2026-07-20 19:00:46.618816+00
134	1	Administrador	editar	retida	Removeu registro de pe├ºa canibalizada.	2026-07-20 19:22:31.525003+00
135	1	Administrador	login	sessao	Login de "admin".	2026-07-20 19:30:15.030208+00
136	1	Administrador	excluir	retida	Removeu o registro da pe├ºa "Polia / engrenagem" da retida SN 100100.	2026-07-20 19:53:18.235815+00
137	1	Administrador	excluir	retida	Removeu o registro da pe├ºa "Bico" da retida SN 100100.	2026-07-20 19:53:34.787654+00
138	1	Administrador	login	sessao	Login de "admin".	2026-07-21 13:27:00.213388+00
139	1	Administrador	login	sessao	Login de "admin".	2026-07-21 14:00:21.670121+00
140	1	Administrador	login	sessao	Login de "admin".	2026-07-21 14:10:18.784017+00
141	1	Administrador	criar	usuario	Criou o usu├írio "samuel.stlflix@gmail.com" (papel: admin).	2026-07-21 14:29:27.789235+00
142	1	Administrador	editar	usuario	Redefiniu a senha de "stlflix.tom@gmail.com".	2026-07-21 14:29:49.985955+00
143	2	Tom	login	sessao	Login de "stlflix.tom@gmail.com".	2026-07-21 14:30:02.993457+00
144	3	Samuel	login	sessao	Login de "samuel.stlflix@gmail.com".	2026-07-21 14:30:03.335863+00
145	3	Samuel	mover	ticket	Moveu o ticket GAR-2026-0001 para "AN├üLISE INTERNA".	2026-07-21 14:45:22.263434+00
146	3	Samuel	mover	ticket	Moveu o ticket GAR-2026-0001 para "PRIMEIRO CONTATO".	2026-07-21 14:45:23.795178+00
147	3	Samuel	editar	ticket	Registrou contato com o cliente no ticket GAR-2026-0001.	2026-07-21 14:45:43.979507+00
148	2	Tom	criar	recebimento	Registrou recebimento do ticket GAR-2026-0001 (1 un., "Conforme esperado").	2026-07-21 15:20:03.048562+00
149	2	Tom	mover	ticket	Moveu o ticket GAR-2026-0001 para "RECEBIMENTOS".	2026-07-21 15:20:29.730603+00
150	2	Tom	editar	catalogo	Atualizou o checklist do modelo #1 (22 componentes).	2026-07-21 15:49:36.79919+00
151	2	Tom	editar	catalogo	Atualizou o checklist do modelo #2 (22 componentes).	2026-07-21 15:50:12.016663+00
\.


--
-- Data for Name: categorias_gasto; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categorias_gasto (id, name, active) FROM stdin;
1	Frete reverso	1
2	Reenvio ao cliente	1
3	Pe├ºa de reposi├º├úo	1
4	M├úo de obra	1
5	Outros	1
\.


--
-- Data for Name: checklist_componentes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.checklist_componentes (id, name, active, ordem) FROM stdin;
1	Fonte de alimenta├º├úo	1	0
2	Cabo de for├ºa	1	1
3	Bico (nozzle)	1	2
4	Hotend	1	3
5	Cama / placa de constru├º├úo	1	4
6	Tela / display	1	5
7	Extrusor	1	6
8	Ventoinhas	1	7
9	Correias	1	8
10	Cabos internos	1	9
11	Tampa / carca├ºa	1	10
12	AMS (multicolor)	1	11
13	Bobina de teste	1	12
14	Manual / acess├│rios	1	13
15	Cama aquecida	1	102
16	Motores de passo	1	104
17	Placa-m├úe	1	106
18	Placa de constru├º├úo (PEI)	1	110
19	AMS Lite	1	112
20	Bobinas / suporte de filamento	1	113
21	Placa de constru├º├úo	1	110
22	M├│dulo de troca de cor	1	112
\.


--
-- Data for Name: columns; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.columns (id, name, order_index, sla_hours, is_waiting_client, is_done, is_received) FROM stdin;
1	PRIMEIRO CONTATO	0	24	1	0	0
2	AN├üLISE INTERNA	1	48	1	0	0
3	3D TOUCH SN	2	72	1	0	0
4	TICKET 3D TOUCH	3	1	1	0	0
5	TICKET BAMBU LAB	4	\N	1	0	0
6	AGUARDANDO ENVIO DO CLIENTE	5	\N	1	0	0
7	RECEBIMENTOS	6	\N	1	0	0
8	AN├üLISE DE EQUIPAMENTO	7	\N	1	0	0
9	ENVIO PARA O CLIENTE	8	\N	1	0	0
10	CONCLU├ìDO	9	\N	1	1	0
\.


--
-- Data for Name: compras; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.compras (id, data_compra, responsavel_compra, fornecedor, contato_fornecedor, marca, modelo, numero_serie, nota_fiscal, data_entrega, status_compra, criado_em) FROM stdin;
1	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D631522686	NF 16170	2026-06-24	Entregue	2026-07-06 12:51:05.634003+00
2	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D631522798	NF 16170	2026-06-24	Entregue	2026-07-06 12:51:05.634009+00
3	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D631523844	NF 16170	2026-06-24	Entregue	2026-07-06 12:51:05.634011+00
4	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D631523234	NF 16170	2026-06-24	Entregue	2026-07-06 12:51:05.634013+00
5	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D631522649	NF 16170	2026-06-24	Entregue	2026-07-06 12:51:05.634014+00
6	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D631528525	NF 16170	2026-06-24	Entregue	2026-07-06 12:51:05.634015+00
7	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D631522675	NF 16170	2026-06-24	Entregue	2026-07-06 12:51:05.634016+00
8	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D631523853	NF 16170	2026-06-24	Entregue	2026-07-06 12:51:05.634018+00
9	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D631524354	NF 16170	2026-06-24	Entregue	2026-07-06 12:51:05.634019+00
10	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D631522679	NF 16170	2026-06-24	Entregue	2026-07-06 12:51:05.634021+00
11	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D631522652	NF 16170	2026-06-24	Entregue	2026-07-06 12:51:05.634022+00
12	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D631524459	NF 16170	2026-06-24	Entregue	2026-07-06 12:51:05.634024+00
13	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D631522656	NF 16170	2026-06-24	Entregue	2026-07-06 12:51:05.634025+00
14	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D631523321	NF 16170	2026-06-24	Entregue	2026-07-06 12:51:05.634026+00
15	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D631522677	NF 16170	2026-06-24	Entregue	2026-07-06 12:51:05.634028+00
16	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D631522673	NF 16170	2026-06-24	Entregue	2026-07-06 12:51:05.634029+00
17	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D631523591	NF 16170	2026-06-24	Entregue	2026-07-06 12:51:05.634031+00
18	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D631523597	NF 16170	2026-06-24	Entregue	2026-07-06 12:51:05.634032+00
19	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D631523839	NF 16170	2026-06-24	Entregue	2026-07-06 12:51:05.634034+00
20	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D631523837	NF 16170	2026-06-24	Entregue	2026-07-06 12:51:05.634035+00
21	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D631522666	NF 16170	2026-06-24	Entregue	2026-07-06 12:51:05.634037+00
22	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D631523624	NF 16170	2026-06-24	Entregue	2026-07-06 12:51:05.634038+00
23	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D630626448	NF 16170	2026-06-24	Entregue	2026-07-06 12:51:05.63404+00
24	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D631523701	NF 16170	2026-06-24	Entregue	2026-07-06 12:51:05.634041+00
25	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D631522688	NF 16170	2026-06-24	Entregue	2026-07-06 12:51:05.634043+00
26	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D631522687	NF 16170	2026-06-24	Entregue	2026-07-06 12:51:05.634045+00
27	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D631523856	NF 16170	2026-06-24	Entregue	2026-07-06 12:51:05.634046+00
28	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D631523750	NF 16170	2026-06-24	Entregue	2026-07-06 12:51:05.634048+00
29	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D631523703	NF 16170	2026-06-24	Entregue	2026-07-06 12:51:05.634049+00
30	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D631523619	NF 16170	2026-06-24	Entregue	2026-07-06 12:51:05.63405+00
31	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D632227026	NF 16171	2026-06-24	Entregue	2026-07-06 12:51:05.634052+00
32	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D632225274	NF 16171	2026-06-24	Entregue	2026-07-06 12:51:05.634053+00
33	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D632222325	NF 16171	2026-06-24	Entregue	2026-07-06 12:51:05.634054+00
34	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D632224911	NF 16171	2026-06-24	Entregue	2026-07-06 12:51:05.634056+00
35	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D632222286	NF 16171	2026-06-24	Entregue	2026-07-06 12:51:05.634057+00
36	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D632223836	NF 16171	2026-06-24	Entregue	2026-07-06 12:51:05.634059+00
37	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D632224899	NF 16171	2026-06-24	Entregue	2026-07-06 12:51:05.63406+00
38	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D632222359	NF 16171	2026-06-24	Entregue	2026-07-06 12:51:05.634061+00
39	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D632224884	NF 16171	2026-06-24	Entregue	2026-07-06 12:51:05.634063+00
40	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D632224912	NF 16171	2026-06-24	Entregue	2026-07-06 12:51:05.634065+00
41	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D632223193	NF 16171	2026-06-24	Entregue	2026-07-06 12:51:05.634066+00
42	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D632224460	NF 16171	2026-06-24	Entregue	2026-07-06 12:51:05.634067+00
43	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D632222283	NF 16171	2026-06-24	Entregue	2026-07-06 12:51:05.634069+00
44	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D631520748	NF 16171	2026-06-24	Entregue	2026-07-06 12:51:05.63407+00
45	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D632222883	NF 16171	2026-06-24	Entregue	2026-07-06 12:51:05.634072+00
46	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D632222310	NF 16171	2026-06-24	Entregue	2026-07-06 12:51:05.634073+00
47	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D632225457	NF 16171	2026-06-24	Entregue	2026-07-06 12:51:05.634075+00
48	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D632222492	NF 16171	2026-06-24	Entregue	2026-07-06 12:51:05.634076+00
49	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D632222576	NF 16171	2026-06-24	Entregue	2026-07-06 12:51:05.634078+00
50	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D632222606	NF 16171	2026-06-24	Entregue	2026-07-06 12:51:05.634079+00
51	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D641321274	NF 16171	2026-06-24	Entregue	2026-07-06 12:51:05.63408+00
52	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D641323146	NF 16171	2026-06-24	Entregue	2026-07-06 12:51:05.634082+00
53	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D632224412	NF 16171	2026-06-24	Entregue	2026-07-06 12:51:05.634083+00
54	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D632224403	NF 16171	2026-06-24	Entregue	2026-07-06 12:51:05.634084+00
55	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D631500858	NF 16171	2026-06-24	Entregue	2026-07-06 12:51:05.634086+00
56	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D641321130	NF 16171	2026-06-24	Entregue	2026-07-06 12:51:05.634087+00
57	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D641322237	NF 16171	2026-06-24	Entregue	2026-07-06 12:51:05.634089+00
58	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D631526395	NF 16171	2026-06-24	Entregue	2026-07-06 12:51:05.63409+00
59	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D631500695	NF 16171	2026-06-24	Entregue	2026-07-06 12:51:05.634092+00
60	2026-06-17	Matheus Correa	3D Touch	Diogo - 41 9284-9402	Bambulab	A1 Combo AMS	03900D631500696	NF 16171	2026-06-24	Entregue	2026-07-06 12:51:05.634103+00
\.


--
-- Data for Name: defect_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.defect_types (id, name, active) FROM stdin;
1	Bico Entupido (Nozzle Clog)	1
2	Extrusor Travado (Extruder Jam)	1
3	Subextrus├úo (Under-extrusion)	1
4	Superextrus├úo (Over-extrusion)	1
5	Pe├ºa Descolando da Mesa (Falta de Ades├úo)	1
6	Efeito "Warping" (Empenamento)	1
7	Primeira Camada Muito Pr├│xima/Longe	1
8	Fios na Pe├ºa (Stringing / Oozing)	1
9	Cicatrizes e Costura Vis├¡vel (Seam Lines)	1
10	Linhas de Camada Inconsistentes (Banding / Z-Wobble)	1
11	Deslocamento de Camada (Layer Shift)	1
12	Filamento ├Ümido	1
13	Filamento Preso no Carretel (N├│)	1
14	Erro de Retra├º├úo / Quebra no Tubo PTFE	1
15	Erro de Temperatura (Thermal Runaway)	1
16	Falha de Nivelamento Autom├ítico (Auto-leveling Error)	1
17	Resson├óncia / Vibra├º├úo	1
\.


--
-- Data for Name: desfechos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.desfechos (id, name, impacto, active) FROM stdin;
3	Frete	parcial	1
4	Troca de Componente Garantia	sem_prejuizo	1
5	Troca de Componente PAGO	parcial	1
8	Gastos Durante Atendimento	parcial	1
9	Perda do Equipamento	total	1
7	Apenas Contato Fiscal	informativo	1
6	Somente Ajuste T├®cnico	informativo	1
1	asdfReparo Feito	sem_prejuizo	1
\.


--
-- Data for Name: estados_retida; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.estados_retida (id, name, active, ordem) FROM stdin;
1	Aguardando destina├º├úo	1	0
2	Em recupera├º├úo	1	1
3	Cemit├®rio de pe├ºas	1	2
4	Em uso ÔÇö Farm	1	3
5	Recuperada	1	4
6	Sucata	1	5
\.


--
-- Data for Name: gastos_ticket; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.gastos_ticket (id, ticket_id, categoria_id, valor, descricao, criado_em) FROM stdin;
\.


--
-- Data for Name: impressoras_retidas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.impressoras_retidas (id, ticket_id, marca, modelo, numero_serie, condicao, estado_id, local, observacao, criado_em, atualizado_em) FROM stdin;
1	d85ba16b-6fd9-4bbf-a2c2-b1954e214d2b	BambuLab	Bambu Lab A1	100100	extrusora	3	\N	Impressora vai para cemit├®rio	2026-07-20 14:28:40.318067+00	2026-07-20 14:29:52.490824+00
2	d85ba16b-6fd9-4bbf-a2c2-b1954e214d2b	BambuLab	Bambu Lab A1	100100	extrusora	3	\N	\N	2026-07-20 14:55:35.808759+00	2026-07-20 14:55:35.808767+00
\.


--
-- Data for Name: kb_artigos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.kb_artigos (id, titulo, categoria, problema, resolucao, pitches, pitches_texto, autor_id, criado_em, atualizado_em, favorito, resolucao_anterior, resolucao_historico) FROM stdin;
1	problema no hotend	\N			[{"titulo": "asdfa", "texto": "asdfasdfasdfas"}]	asdfa\nasdfasdfasdfas	1	2026-07-14 12:43:07.410464+00	2026-07-14 12:43:07.410468+00	0	\N	\N
2	POL├ìTICA DE GARANTIA E ASSIST├èNCIA T├ëCNICA	Regras de neg├│cio		Estas regras se aplicam ├ás impressoras 3D BambuLab comercializadas pela STLFlix, em conformidade com a **Lei n┬║ 8.078/1990 (C├│digo de Defesa do Consumidor ÔÇô CDC)**.\n\n# Partes e cadeia de fornecimento\n\n## Partes envolvidas\n- **STLFLIX** ÔÇö Revenda. Presta garantia diretamente ou atrav├®s de distribuidora.\n- **BambuLab** ÔÇö Fabricante. Responsabilidade solid├íria.\n\n## Responsabilidade solid├íria\nConforme o **art. 18 do CDC**, todos os integrantes da cadeia de fornecimento (fabricante, distribuidores e revendedor) respondem solidariamente perante o consumidor pelos v├¡cios de qualidade ou quantidade do produto.\n\n**Importante:** independentemente de qual fornecedor tenha intermediado a aquisi├º├úo, a STLFlix, como revendedora, integra a cadeia de consumo e responde perante o consumidor final.\n\n# Tipos de garantia e prazos\n\n## Garantia legal (obrigat├│ria por lei ÔÇö art. 26 do CDC)\nObrigat├│ria, independentemente de qualquer declara├º├úo do fornecedor. Para produtos dur├íveis, como as impressoras 3D, o prazo ├® de **90 (noventa) dias**, contados:\n- Da **data de entrega** do produto, para v├¡cios aparentes ou de f├ícil constata├º├úo.\n- Da **data em que o defeito se manifestar**, para v├¡cios ocultos (de dif├¡cil constata├º├úo).\n\n## Garantia contratual (fornecida pela BambuLab)\nA BambuLab oferece garantia contratual de **12 (doze) meses** a partir da data de compra, conforme condi├º├Áes publicadas pelo fabricante. ├ë **adicional e complementar** ├á garantia legal, n├úo a substituindo.\n\n## Prazo total de prote├º├úo\n- **Garantia legal (CDC):** 90 dias\n- **Garantia contratual (BambuLab):** 12 meses\n\n*A garantia contratual n├úo afasta os direitos legalmente assegurados ao consumidor.*\n\n# Procedimento de atendimento\n\n## Como acionar a garantia\nO consumidor deve entrar em contato pelos canais oficiais da STLFlix, relatando o defeito e apresentando:\n- Nota fiscal ou comprovante de compra;\n- Descri├º├úo do problema apresentado;\n- Fotos ou v├¡deos do defeito (quando aplic├ível).\n\n## Prazo para reparo (art. 18, ┬º1┬║ do CDC)\nAp├│s o registro da reclama├º├úo, a STLFlix ÔÇö ou o canal de suporte respons├ível ÔÇö ter├í o prazo m├íximo de **30 (trinta) dias** para sanar o v├¡cio do produto.\n\n## Prazo de resposta inicial\nComo diretriz interna, a STLFlix deve emitir **protocolo de atendimento** e confirmar o recebimento da solicita├º├úo em at├® **7 (sete) dias ├║teis**, informando os pr├│ximos passos.\n\nEsse prazo de resposta inicial **n├úo se confunde** com o prazo legal de solu├º├úo do v├¡cio ÔÇö tem car├íter exclusivamente operacional, para organiza├º├úo e acompanhamento.\n\n## Fluxo por fornecedor de origem\nO atendimento segue o fluxo normal de envio ao suporte da fabricante BambuLab, **independentemente do distribuidor de origem**. A STLFlix permanece como ponto de contato do consumidor e ├® solidariamente respons├ível pelo cumprimento dos prazos legais.\n\n# Direitos do consumidor (v├¡cio n├úo sanado)\n\nCaso o problema n├úo seja solucionado dentro do prazo de **30 dias**, o consumidor poder├í exigir, ├á sua escolha, uma das alternativas do **art. 18, ┬º1┬║ do CDC**:\n- **Substitui├º├úo do produto** por outro da mesma esp├®cie, em perfeitas condi├º├Áes de uso;\n- **Restitui├º├úo imediata do valor pago**, monetariamente atualizado, sem preju├¡zo de eventuais perdas e danos;\n- **Abatimento proporcional do pre├ºo.**\n\n**Aten├º├úo:** o prazo de 30 dias ├® contado de forma cont├¡nua desde a primeira manifesta├º├úo do v├¡cio, **n├úo se renovando** a cada nova tentativa de reparo.\n\n# Hip├│teses de exclus├úo de garantia\n\nA garantia **n├úo se aplica** nos seguintes casos:\n- Danos por uso indevido, neglig├¬ncia, acidentes ou quedas;\n- Modifica├º├Áes, adapta├º├Áes ou reparos feitos fora da rede autorizada BambuLab;\n- Desgaste natural pelo uso regular (pe├ºas consum├¡veis: bico extrusor, cama de impress├úo, correias, etc.);\n- Danos por varia├º├úo de tens├úo el├®trica, raios ou fen├┤menos naturais;\n- Uso de filamentos incompat├¡veis ou de qualidade inadequada que causem danos ao equipamento;\n- Impossibilidade de comprovar a rela├º├úo de consumo por qualquer meio (nota fiscal, extrato de cart├úo, e-mail de confirma├º├úo, print do sistema de vendas ou outro meio id├┤neo), quando indispens├ível para verificar a data de aquisi├º├úo e o prazo de garantia.\n\n# Obriga├º├Áes da STLFlix como revendedora\n\n- Registrar todas as reclama├º├Áes de garantia com **data, hora e descri├º├úo** do defeito;\n- Emitir **protocolo de atendimento** ao consumidor;\n- Garantir que o prazo de **30 dias** para reparo seja rigorosamente monitorado;\n- Oferecer proativamente as alternativas do **art. 18, ┬º1┬║ do CDC** caso o prazo seja extrapolado;\n- Manter canal direto com a BambuLab e distribuidores para otimizar envio de pe├ºas e suporte;\n- Exercer **direito de regresso** contra o fornecedor respons├ível pelo v├¡cio, ap├│s resolver o caso com o consumidor.\n\n**Importante:** se o fabricante n├úo responder em 30 dias, a STLFlix deve adotar as medidas cab├¡veis diretamente perante o consumidor (substitui├º├úo, reembolso ou abatimento), exercendo o direito de regresso depois ÔÇö **sem aguardar indefinidamente** o elo anterior da cadeia.\n\n# V├¡cio de quantidade (art. 19 do CDC)\n\nNos termos do **art. 19 do CDC**, a STLFlix tamb├®m responde por **v├¡cios de quantidade** ÔÇö quando o produto ├® entregue com pe├ºas, acess├│rios ou componentes faltando em rela├º├úo ao anunciado ou ao que consta na embalagem.\n\nNesses casos, aplicam-se os mesmos prazos e direitos anteriores, podendo o consumidor exigir a **complementa├º├úo**, a **substitui├º├úo** do produto ou o **abatimento proporcional** do pre├ºo.\n\n# Canais de atendimento\n\n## Canais oficiais da STLFlix\n- **Site:** www.stlflix.com.br\n- **E-mail:** suporte@stlflix.com.br\n- **WhatsApp / Chat:** conforme informado na plataforma de compra\n\nAp├│s a abertura do chamado, o consumidor tamb├®m pode ser direcionado ao **suporte oficial da BambuLab**: https://bambulab.com/pt-BR/support\n\n# Disposi├º├Áes gerais\n\n- Documento de car├íter **interno**, para orientar os colaboradores no tratamento de solicita├º├Áes de garantia das impressoras BambuLab.\n- Deve ser observado por todos os colaboradores no atendimento, sem preju├¡zo da legisla├º├úo vigente.\n- Em caso de diverg├¬ncia com a lei, prevalece a interpreta├º├úo mais aderente ├ás **normas consumeristas**.\n- Os fluxos podem ser revisados a qualquer momento (mudan├ºas legislativas, procedimentos de fabricante/distribuidor ou necessidades operacionais).\n- Situa├º├Áes n├úo previstas devem ser submetidas ├á gest├úo, com apoio jur├¡dico quando necess├írio.\n\n*├Ültima atualiza├º├úo do documento original: 08 de julho de 2026.*	[]		1	2026-07-15 19:47:00.614451+00	2026-07-15 19:52:07.462827+00	0	\N	[{"texto": "POL\\u00cdTICA DE GARANTIA E ASSIST\\u00caNCIA T\\u00c9CNICA\\nPROCEDIMENTO INTERNO\\nImpressoras 3D BambuLab\\nSTLFlix \\u2014 Revendedor Autorizado\\n\\nIDENTIFICA\\u00c7\\u00c3O DAS PARTES E DA CADEIA DE FORNECIMENTO\\nO presente documento estabelece as regras de garantia aplic\\u00e1veis \\u00e0s impressoras 3D BambuLab comercializadas pela STLFlix, em conformidade com a Lei n\\u00ba 8.078/1990 (C\\u00f3digo de Defesa do Consumidor \\u2013 CDC).\\n\\nPartes envolvidas na cadeia de fornecimento:\\n\\nFornecedor\\nPapel na Cadeia\\nResponsabilidade de Garantia\\nSTLFLIX\\nRevenda\\nPresta garantia diretamente ou atrav\\u00e9s de distribuidora.\\nBambuLab\\nFabricante\\nResponsabilidade solid\\u00e1ria (fabricante)\\n\\n\\nResponsabilidade solid\\u00e1ria: Conforme o art. 18 do CDC, todos os integrantes da cadeia de fornecimento \\u2014 fabricante, distribuidores e revendedor \\u2014 respondem solidariamente perante o consumidor pelos v\\u00edcios de qualidade ou quantidade do produto.\\n\\nImportante: Independentemente de qual fornecedor tenha intermediado a aquisi\\u00e7\\u00e3o, a STLFlix, como revendedora, integra a cadeia de consumo e responde perante o consumidor final.\\n\\nTIPOS DE GARANTIA APLIC\\u00c1VEIS\\nGarantia Legal (obrigat\\u00f3ria por lei \\u2014 art. 26 do CDC)\\n\\nA garantia legal \\u00e9 obrigat\\u00f3ria, independentemente de qualquer declara\\u00e7\\u00e3o do fornecedor. Para produtos dur\\u00e1veis, como as impressoras 3D, o prazo \\u00e9 de 90 (noventa) dias contados:\\n\\nDa data de entrega do produto, para v\\u00edcios aparentes ou de f\\u00e1cil constata\\u00e7\\u00e3o.\\nDa data em que o defeito se manifestar, para v\\u00edcios ocultos (de dif\\u00edcil constata\\u00e7\\u00e3o).\\n\\nGarantia Contratual (fornecida pelo fabricante BambuLab)\\n\\nA BambuLab oferece garantia contratual de 12 (doze) meses a partir da data de compra, conforme condi\\u00e7\\u00f5es publicadas pelo fabricante. Esta garantia \\u00e9 adicional e complementar \\u00e0 garantia legal, n\\u00e3o a substituindo.\\n\\nPrazo Total de Prote\\u00e7\\u00e3o\\n\\nTipo de Garantia\\nPrazo\\nGarantia Legal (CDC)\\n90 dias\\nGarantia Contratual (BambuLab)\\n12 meses\\n\\n\\n\\nObserva\\u00e7\\u00e3o: A garantia contratual oferecida pela BambuLab possui prazo de 12 (doze) meses e \\u00e9 complementar \\u00e0 garantia legal prevista no C\\u00f3digo de Defesa do Consumidor, n\\u00e3o afastando os direitos legalmente assegurados ao consumidor.\\n\\n\\nPROCEDIMENTO DE ATENDIMENTO AO CONSUMIDOR\\nComo acionar a garantia\\n\\nO consumidor dever\\u00e1 entrar em contato com a STLFlix pelos canais oficiais de atendimento, relatando o defeito e apresentando os seguintes documentos:\\n\\nNota fiscal ou comprovante de compra;\\nDescri\\u00e7\\u00e3o do problema apresentado;\\nFotos ou v\\u00eddeos do defeito (quando aplic\\u00e1vel).\\n\\nPrazo para reparo (art. 18, \\u00a71\\u00ba do CDC)\\n\\nAp\\u00f3s o registro da reclama\\u00e7\\u00e3o, a STLFlix \\u2014 ou o canal de suporte respons\\u00e1vel \\u2014 ter\\u00e1 o prazo m\\u00e1ximo de 30 (trinta) dias para sanar o v\\u00edcio do produto.\\n\\nPrazo de resposta inicial ao consumidor\\n\\nComo diretriz interna de atendimento, a STLFlix dever\\u00e1 emitir protocolo de atendimento e confirmar o recebimento da solicita\\u00e7\\u00e3o em at\\u00e9 7 (sete) dias \\u00fateis, informando os pr\\u00f3ximos passos do atendimento.\\n\\nEsse prazo de resposta inicial n\\u00e3o se confunde com o prazo legal aplic\\u00e1vel \\u00e0 solu\\u00e7\\u00e3o do v\\u00edcio do produto, possuindo car\\u00e1ter exclusivamente operacional para fins de organiza\\u00e7\\u00e3o e acompanhamento dos atendimentos.\\n\\nFluxo por fornecedor de origem\\n\\nO atendimento seguir\\u00e1 o fluxo normal de envio ao suporte da fabricante Bambulab, independentemente do distribuidor de origem. \\n\\nA STLFlix permanece como ponto de contato do consumidor e \\u00e9 solidariamente respons\\u00e1vel pelo cumprimento dos prazos legais.\\n\\nDIREITOS DO CONSUMIDOR EM CASO DE V\\u00cdCIO N\\u00c3O SANADO\\nCaso o problema n\\u00e3o seja solucionado dentro do prazo de 30 dias, o consumidor poder\\u00e1 exigir, \\u00e0 sua escolha, uma das seguintes alternativas (art. 18, \\u00a71\\u00ba do CDC):\\n\\nSubstitui\\u00e7\\u00e3o do produto por outro da mesma esp\\u00e9cie, em perfeitas condi\\u00e7\\u00f5es de uso;\\nRestitui\\u00e7\\u00e3o imediata do valor pago, monetariamente atualizado, sem preju\\u00edzo de eventuais perdas e danos;\\nAbatimento proporcional do pre\\u00e7o.\\n\\nO prazo de 30 dias \\u00e9 contado de forma cont\\u00ednua desde a primeira manifesta\\u00e7\\u00e3o do v\\u00edcio, n\\u00e3o se renovando a cada nova tentativa de reparo.\\n\\nHIP\\u00d3TESES DE EXCLUS\\u00c3O DE GARANTIA\\nA garantia n\\u00e3o se aplica nos seguintes casos:\\n\\nDanos causados por uso indevido, neglig\\u00eancia, acidentes ou quedas;\\nModifica\\u00e7\\u00f5es, adapta\\u00e7\\u00f5es ou reparos realizados fora da rede autorizada BambuLab;\\nDesgaste natural decorrente do uso regular (pe\\u00e7as consum\\u00edveis: bico extrusor, cama de impress\\u00e3o, correias, etc.);\\nDanos causados por varia\\u00e7\\u00e3o de tens\\u00e3o el\\u00e9trica, raios ou fen\\u00f4menos naturais;\\nUso de materiais (filamentos) incompat\\u00edveis ou de qualidade inadequada que causem danos ao equipamento;\\nImpossibilidade de comprova\\u00e7\\u00e3o da rela\\u00e7\\u00e3o de consumo por qualquer meio (nota fiscal, extrato de cart\\u00e3o, e-mail de confirma\\u00e7\\u00e3o de pedido, print do sistema de vendas ou outro meio id\\u00f4neo), quando essa comprova\\u00e7\\u00e3o for indispens\\u00e1vel para verificar a data de aquisi\\u00e7\\u00e3o e o prazo de garantia.\\n\\nOBRIGA\\u00c7\\u00d5ES DA STLFLIX COMO REVENDEDORA\\n\\u00c9 de obriga\\u00e7\\u00e3o da STLFLIX, na qualidade de revendedora:\\n\\nRegistrar todas as reclama\\u00e7\\u00f5es de garantia com data, hora e descri\\u00e7\\u00e3o do defeito;\\nEmitir protocolo de atendimento ao consumidor;\\nGarantir que o prazo de 30 (trinta) dias para reparo seja rigorosamente monitorado;\\nOferecer proativamente as alternativas do art. 18, \\u00a71\\u00ba do CDC, caso o prazo seja extrapolado;\\nManter canal de comunica\\u00e7\\u00e3o direto com a BambuLab e com os distribuidores para otimizar envio de pe\\u00e7as e suporte t\\u00e9cnico;\\nExercer direito de regresso contra o fornecedor respons\\u00e1vel pelo v\\u00edcio, ap\\u00f3s resolu\\u00e7\\u00e3o do caso com o consumidor final.\\nCaso o fabricante n\\u00e3o responda dentro do prazo de 30 dias, a STLFlix dever\\u00e1 adotar as medidas cab\\u00edveis diretamente perante o consumidor (substitui\\u00e7\\u00e3o, reembolso ou abatimento), exercendo posteriormente o direito de regresso, sem aguardar indefinidamente a manifesta\\u00e7\\u00e3o do elo anterior da cadeia.\\n\\nV\\u00cdCIO DE QUANTIDADE (art. 19 do CDC)\\nNos termos do art. 19 do CDC, a STLFlix tamb\\u00e9m responde por v\\u00edcios de quantidade, que ocorrem quando o produto \\u00e9 entregue com pe\\u00e7as, acess\\u00f3rios ou componentes faltando em rela\\u00e7\\u00e3o ao que foi anunciado ou ao que consta na embalagem. Nesses casos, aplicam-se os mesmos prazos e direitos previstos nos itens anteriores, podendo o consumidor exigir a complementa\\u00e7\\u00e3o, a substitui\\u00e7\\u00e3o do produto ou o abatimento proporcional do pre\\u00e7o.\\n\\nCANAIS DE ATENDIMENTO E SUPORTE\\nPara acionar a garantia ou obter suporte t\\u00e9cnico, o consumidor deve utilizar os canais oficiais da STLFlix:\\n\\nSite oficial: www.stlflix.com.br\\nE-mail de suporte: suporte@stlflix.com.br\\nWhatsApp / Chat: conforme informado na plataforma de compra\\n\\nAp\\u00f3s abertura de chamado na STLFlix, o consumidor tamb\\u00e9m poder\\u00e1 ser direcionado ao suporte oficial da BambuLab:\\n\\nSuporte BambuLab: https://bambulab.com/pt-BR/support\\n\\nDISPOSI\\u00c7\\u00d5ES GERAIS\\n\\nEste documento possui car\\u00e1ter exclusivamente interno e tem por finalidade orientar os colaboradores da STLFlix quanto ao tratamento de solicita\\u00e7\\u00f5es de garantia e assist\\u00eancia t\\u00e9cnica relacionadas \\u00e0s impressoras 3D BambuLab comercializadas pela empresa.\\n\\nAs diretrizes previstas neste documento dever\\u00e3o ser observadas por todos os colaboradores envolvidos no atendimento ao consumidor, sem preju\\u00edzo da aplica\\u00e7\\u00e3o da legisla\\u00e7\\u00e3o vigente e das pol\\u00edticas espec\\u00edficas dos fabricantes, distribuidores e assist\\u00eancias t\\u00e9cnicas autorizadas.\\n\\nEm caso de diverg\\u00eancia entre os procedimentos aqui previstos e a legisla\\u00e7\\u00e3o aplic\\u00e1vel, dever\\u00e1 prevalecer a interpreta\\u00e7\\u00e3o mais aderente \\u00e0s normas consumeristas vigentes, cabendo \\u00e0 STLFlix adequar o atendimento conforme o caso concreto.\\n\\nOs fluxos operacionais descritos neste documento poder\\u00e3o ser revisados e atualizados a qualquer momento pela STLFlix, especialmente em raz\\u00e3o de altera\\u00e7\\u00f5es legislativas, mudan\\u00e7as nos procedimentos dos fabricantes ou distribuidores, ou necessidades operacionais identificadas pela empresa.\\n\\nSitua\\u00e7\\u00f5es n\\u00e3o contempladas expressamente nesta pol\\u00edtica dever\\u00e3o ser submetidas \\u00e0 an\\u00e1lise da gest\\u00e3o respons\\u00e1vel, com apoio jur\\u00eddico quando necess\\u00e1rio.\\n\\nEsta pol\\u00edtica entra em vigor na data de sua aprova\\u00e7\\u00e3o interna e permanecer\\u00e1 v\\u00e1lida at\\u00e9 sua substitui\\u00e7\\u00e3o por vers\\u00e3o posterior.\\n\\nData da \\u00faltima atualiza\\u00e7\\u00e3o: 08 de julho de 2026\\n", "data": "2026-07-15T19:52:07.425956"}]
\.


--
-- Data for Name: modelo_checklist; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.modelo_checklist (id, modelo_id, componente_id, ordem) FROM stdin;
1	4	3	0
2	4	4	1
3	4	15	2
4	4	9	3
5	4	16	4
6	4	1	5
7	4	17	6
8	4	6	7
9	4	8	8
10	4	10	9
11	4	18	10
12	4	2	11
13	4	14	12
14	5	3	0
15	5	4	1
16	5	15	2
17	5	9	3
18	5	16	4
19	5	1	5
20	5	17	6
21	5	6	7
22	5	8	8
23	5	10	9
24	5	18	10
25	5	2	11
26	5	19	12
27	5	20	13
28	5	14	14
29	6	3	0
30	6	4	1
31	6	15	2
32	6	9	3
33	6	16	4
34	6	1	5
35	6	17	6
36	6	6	7
37	6	8	8
38	6	10	9
39	6	18	10
40	6	2	11
41	6	14	12
42	7	3	0
43	7	4	1
44	7	15	2
45	7	9	3
46	7	16	4
47	7	1	5
48	7	17	6
49	7	6	7
50	7	8	8
51	7	10	9
52	7	18	10
53	7	2	11
54	7	19	12
55	7	20	13
56	7	14	14
57	8	3	0
58	8	4	1
59	8	15	2
60	8	9	3
61	8	16	4
62	8	1	5
63	8	17	6
64	8	6	7
65	8	8	8
66	8	10	9
67	8	21	10
68	8	2	11
69	8	22	12
70	8	20	13
71	8	14	14
72	1	1	0
73	1	2	1
74	1	3	2
75	1	4	3
76	1	5	4
77	1	6	5
78	1	7	6
79	1	8	7
80	1	9	8
81	1	10	9
82	1	11	10
83	1	12	11
84	1	13	12
85	1	14	13
86	1	15	14
87	1	16	15
88	1	17	16
89	1	21	17
90	1	18	18
91	1	19	19
92	1	22	20
93	1	20	21
94	2	1	0
95	2	2	1
96	2	3	2
97	2	4	3
98	2	5	4
99	2	6	5
100	2	7	6
101	2	8	7
102	2	9	8
103	2	10	9
104	2	11	10
105	2	12	11
106	2	13	12
107	2	14	13
108	2	15	14
109	2	16	15
110	2	17	16
111	2	21	17
112	2	18	18
113	2	19	19
114	2	22	20
115	2	20	21
\.


--
-- Data for Name: pecas_padrao; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pecas_padrao (id, name, active, ordem) FROM stdin;
1	Bico (nozzle)	1	0
2	Hotend completo	1	1
3	Placa-m├úe	1	2
4	Fonte de alimenta├º├úo	1	3
5	Correia	1	4
6	Motor de passo	1	5
7	Cama aquecida	1	6
8	Sensor	1	7
9	Cabo flat	1	8
10	Ventoinha	1	9
11	Tela / display	1	10
12	Extrusor	1	11
13	Bloco aquecedor	1	2
14	Termistor	1	3
15	Cartucho aquecedor (heater)	1	4
16	Placa-m├úe (mainboard)	1	5
17	Motor de passo (NEMA)	1	7
18	Correia (belt)	1	8
19	Polia / engrenagem	1	9
20	Cama aquecida (heatbed)	1	10
21	Placa de constru├º├úo (build plate / PEI)	1	11
22	Sensor (fim de curso / cama / filamento)	1	12
23	Cabo flat / FFC	1	13
24	Ventoinha (hotend / pe├ºa / placa)	1	14
25	Extrusor (conjunto)	1	16
26	Engrenagem do extrusor	1	17
27	Tubo PTFE / bowden	1	18
28	AMS (unidade multicolor)	1	19
29	M├│dulo LiDAR / c├ómera	1	20
30	Cabos internos	1	21
\.


--
-- Data for Name: printer_brands; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.printer_brands (id, name, active) FROM stdin;
1	BambuLab	1
3	Snapmaker	1
\.


--
-- Data for Name: printer_models; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.printer_models (id, brand_id, name, sku, current_price, active) FROM stdin;
3	1	A1 Combo AMS	BLA1C	5500.00	1
8	3	Snapmaker U1	\N	0.00	1
5	1	A1 Combo	\N	0.00	1
6	1	A1 Mini	\N	0.00	1
7	1	A1 Mini Combo	\N	0.00	1
1	1	BambuLab A1 mini	BLA1M	2000.00	1
4	1	A1	\N	0.00	1
2	1	BambuLab A1	BLA1	3500.00	1
\.


--
-- Data for Name: recebimento_checklist; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.recebimento_checklist (id, recebimento_id, componente_nome, estado, comentario, criado_em) FROM stdin;
\.


--
-- Data for Name: recebimentos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.recebimentos (id, ticket_id, data_recebimento, numero_nf, quantidade, condicao, observacao, criado_por_id) FROM stdin;
1	d85ba16b-6fd9-4bbf-a2c2-b1954e214d2b	2026-07-21	adasdf	1	Conforme esperado	teste	2
\.


--
-- Data for Name: retida_historico; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.retida_historico (id, retida_id, estado_de, estado_para, local, nota, autor_id, criado_em) FROM stdin;
1	1	\N	Cemit├®rio de pe├ºas	\N	\N	1	2026-07-20 14:29:52.495762+00
2	2	\N	Cemit├®rio de pe├ºas	\N	\N	1	2026-07-20 14:55:35.832028+00
3	2	Cemit├®rio de pe├ºas	Cemit├®rio de pe├ºas	\N	\N	1	2026-07-20 18:51:48.412389+00
\.


--
-- Data for Name: retida_notas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.retida_notas (id, retida_id, texto, autor_id, criado_em) FROM stdin;
\.


--
-- Data for Name: retida_pecas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.retida_pecas (id, retida_id, peca, destino_texto, destino_retida_id, autor_id, criado_em, destino_ticket_id) FROM stdin;
1	1	PLACA AC	\N	\N	1	2026-07-20 14:29:18.397437+00	\N
2	1	Hotend	Para ticket GAR-2026-0002	\N	1	2026-07-20 14:29:33.336408+00	\N
4	2	Cabo flat	\N	\N	1	2026-07-20 18:38:27.788409+00	\N
5	2	Sensor	pe├ºa retirada	\N	1	2026-07-20 18:38:49.956939+00	\N
\.


--
-- Data for Name: status_tags; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.status_tags (id, name, color) FROM stdin;
\.


--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.suppliers (id, name, active) FROM stdin;
2	KARIMEX	1
3	PAUTA	1
1	3D Touch	1
\.


--
-- Data for Name: ticket_eventos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ticket_eventos (id, ticket_id, tipo, texto, autor_id, criado_em) FROM stdin;
1	d85ba16b-6fd9-4bbf-a2c2-b1954e214d2b	comentario	Pe├ºa "Cabo flat" retirada desta impressora retida (SN 100100).	1	2026-07-20 18:38:27.792352+00
2	d85ba16b-6fd9-4bbf-a2c2-b1954e214d2b	comentario	Pe├ºa "Sensor" retirada desta impressora retida (SN 100100).	1	2026-07-20 18:38:49.957419+00
3	d85ba16b-6fd9-4bbf-a2c2-b1954e214d2b	comentario	Pe├ºa "Polia / engrenagem" retirada desta impressora retida (SN 100100).	1	2026-07-20 18:51:23.211709+00
4	d85ba16b-6fd9-4bbf-a2c2-b1954e214d2b	comentario	Pe├ºa "Cabos internos" retirada desta impressora retida (SN 100100).	1	2026-07-20 19:00:46.627763+00
5	d85ba16b-6fd9-4bbf-a2c2-b1954e214d2b	comentario	Pe├ºa "Cabos internos" aproveitada da impressora retida SN 100100.	1	2026-07-20 19:00:46.627767+00
6	d85ba16b-6fd9-4bbf-a2c2-b1954e214d2b	comentario	Administrador removeu o registro da pe├ºa "Polia / engrenagem" da impressora retida (SN 100100).	1	2026-07-20 19:53:18.247944+00
7	d85ba16b-6fd9-4bbf-a2c2-b1954e214d2b	comentario	Administrador removeu o registro da pe├ºa "Bico" da impressora retida (SN 100100).	1	2026-07-20 19:53:34.789483+00
8	d85ba16b-6fd9-4bbf-a2c2-b1954e214d2b	movimento	Movido de "PRIMEIRO CONTATO" para "AN├üLISE INTERNA".	3	2026-07-21 14:45:22.270637+00
9	d85ba16b-6fd9-4bbf-a2c2-b1954e214d2b	movimento	Movido de "AN├üLISE INTERNA" para "PRIMEIRO CONTATO".	3	2026-07-21 14:45:23.796479+00
10	d85ba16b-6fd9-4bbf-a2c2-b1954e214d2b	contato	Contato com o cliente registrado.	3	2026-07-21 14:45:43.988387+00
11	d85ba16b-6fd9-4bbf-a2c2-b1954e214d2b	recebimento	Recebimento registrado: 1 un., condi├º├úo "Conforme esperado".	2	2026-07-21 15:20:03.063771+00
12	d85ba16b-6fd9-4bbf-a2c2-b1954e214d2b	movimento	Movido de "PRIMEIRO CONTATO" para "RECEBIMENTOS".	2	2026-07-21 15:20:29.737057+00
\.


--
-- Data for Name: ticket_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ticket_history (id, ticket_id, from_column_id, to_column_id, moved_at) FROM stdin;
1	d85ba16b-6fd9-4bbf-a2c2-b1954e214d2b	\N	1	2026-07-20 14:21:36.855685+00
2	d85ba16b-6fd9-4bbf-a2c2-b1954e214d2b	1	2	2026-07-21 14:45:22.245568+00
3	d85ba16b-6fd9-4bbf-a2c2-b1954e214d2b	2	1	2026-07-21 14:45:23.787065+00
4	d85ba16b-6fd9-4bbf-a2c2-b1954e214d2b	1	7	2026-07-21 15:20:29.724336+00
\.


--
-- Data for Name: ticket_tags; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ticket_tags (ticket_id, tag_id) FROM stdin;
\.


--
-- Data for Name: tickets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tickets (id, titulo, problema, numero_nf, notas, origem, codigo_rastreio, requer_contato_cliente, retorno_horas, retorno_definido_em, printer_model_id, serial_number, quantidade, custo_unitario, column_id, order_index, created_at, updated_at, last_moved_at, supplier_id, defect_type_id, codigo_interno, responsavel_id, desfecho_id, prejuizo_real, ticket_suporte_externo, faixa_prazo) FROM stdin;
d85ba16b-6fd9-4bbf-a2c2-b1954e214d2b	Teste Impressora retida	extrusora	\N	\N	atendimento_interno	\N	0	\N	\N	2	100100	1	3500.00	7	0	2026-07-20 14:21:36.855685+00	2026-07-21 15:20:29.724336+00	2026-07-21 15:20:29.729827+00	2	1	GAR-2026-0001	2	\N	\N	\N	1_7
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, nome, password_hash, role, active) FROM stdin;
1	admin	Administrador	$2b$12$N1HTzFAQTpvR.40HgHM4cuTprQNZr1u5mh5n5kMYQZJYP1lbIXkSy	admin	1
3	samuel.stlflix@gmail.com	Samuel	$2b$12$Cx1OWdlhyzy1Gp17q9jAxuXr7gf52G5ryEVBZSrpxfPoyn4ONzMfG	admin	1
2	stlflix.tom@gmail.com	Tom	$2b$12$7YcI/MYJ4DUloGGoOiEZ0eT5i6wNoM6t0RhZegeWXeO5vaxII0jTK	admin	1
\.


--
-- Name: attachments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.attachments_id_seq', 1, false);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 151, true);


--
-- Name: categorias_gasto_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.categorias_gasto_id_seq', 5, true);


--
-- Name: checklist_componentes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.checklist_componentes_id_seq', 22, true);


--
-- Name: columns_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.columns_id_seq', 10, true);


--
-- Name: compras_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.compras_id_seq', 60, true);


--
-- Name: defect_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.defect_types_id_seq', 17, true);


--
-- Name: desfechos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.desfechos_id_seq', 9, true);


--
-- Name: estados_retida_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.estados_retida_id_seq', 6, true);


--
-- Name: gastos_ticket_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.gastos_ticket_id_seq', 1, false);


--
-- Name: impressoras_retidas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.impressoras_retidas_id_seq', 2, true);


--
-- Name: kb_artigos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.kb_artigos_id_seq', 2, true);


--
-- Name: modelo_checklist_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.modelo_checklist_id_seq', 115, true);


--
-- Name: pecas_padrao_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pecas_padrao_id_seq', 30, true);


--
-- Name: printer_brands_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.printer_brands_id_seq', 3, true);


--
-- Name: printer_models_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.printer_models_id_seq', 8, true);


--
-- Name: recebimento_checklist_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.recebimento_checklist_id_seq', 1, false);


--
-- Name: recebimentos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.recebimentos_id_seq', 1, true);


--
-- Name: retida_historico_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.retida_historico_id_seq', 3, true);


--
-- Name: retida_notas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.retida_notas_id_seq', 1, false);


--
-- Name: retida_pecas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.retida_pecas_id_seq', 7, true);


--
-- Name: status_tags_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.status_tags_id_seq', 1, false);


--
-- Name: suppliers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.suppliers_id_seq', 3, true);


--
-- Name: ticket_eventos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ticket_eventos_id_seq', 12, true);


--
-- Name: ticket_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ticket_history_id_seq', 4, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 3, true);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: attachments attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: categorias_gasto categorias_gasto_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categorias_gasto
    ADD CONSTRAINT categorias_gasto_name_key UNIQUE (name);


--
-- Name: categorias_gasto categorias_gasto_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categorias_gasto
    ADD CONSTRAINT categorias_gasto_pkey PRIMARY KEY (id);


--
-- Name: checklist_componentes checklist_componentes_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.checklist_componentes
    ADD CONSTRAINT checklist_componentes_name_key UNIQUE (name);


--
-- Name: checklist_componentes checklist_componentes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.checklist_componentes
    ADD CONSTRAINT checklist_componentes_pkey PRIMARY KEY (id);


--
-- Name: columns columns_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.columns
    ADD CONSTRAINT columns_pkey PRIMARY KEY (id);


--
-- Name: compras compras_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.compras
    ADD CONSTRAINT compras_pkey PRIMARY KEY (id);


--
-- Name: defect_types defect_types_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.defect_types
    ADD CONSTRAINT defect_types_name_key UNIQUE (name);


--
-- Name: defect_types defect_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.defect_types
    ADD CONSTRAINT defect_types_pkey PRIMARY KEY (id);


--
-- Name: desfechos desfechos_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.desfechos
    ADD CONSTRAINT desfechos_name_key UNIQUE (name);


--
-- Name: desfechos desfechos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.desfechos
    ADD CONSTRAINT desfechos_pkey PRIMARY KEY (id);


--
-- Name: estados_retida estados_retida_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.estados_retida
    ADD CONSTRAINT estados_retida_name_key UNIQUE (name);


--
-- Name: estados_retida estados_retida_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.estados_retida
    ADD CONSTRAINT estados_retida_pkey PRIMARY KEY (id);


--
-- Name: gastos_ticket gastos_ticket_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gastos_ticket
    ADD CONSTRAINT gastos_ticket_pkey PRIMARY KEY (id);


--
-- Name: impressoras_retidas impressoras_retidas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.impressoras_retidas
    ADD CONSTRAINT impressoras_retidas_pkey PRIMARY KEY (id);


--
-- Name: kb_artigos kb_artigos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kb_artigos
    ADD CONSTRAINT kb_artigos_pkey PRIMARY KEY (id);


--
-- Name: modelo_checklist modelo_checklist_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.modelo_checklist
    ADD CONSTRAINT modelo_checklist_pkey PRIMARY KEY (id);


--
-- Name: pecas_padrao pecas_padrao_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pecas_padrao
    ADD CONSTRAINT pecas_padrao_name_key UNIQUE (name);


--
-- Name: pecas_padrao pecas_padrao_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pecas_padrao
    ADD CONSTRAINT pecas_padrao_pkey PRIMARY KEY (id);


--
-- Name: printer_brands printer_brands_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.printer_brands
    ADD CONSTRAINT printer_brands_name_key UNIQUE (name);


--
-- Name: printer_brands printer_brands_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.printer_brands
    ADD CONSTRAINT printer_brands_pkey PRIMARY KEY (id);


--
-- Name: printer_models printer_models_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.printer_models
    ADD CONSTRAINT printer_models_pkey PRIMARY KEY (id);


--
-- Name: recebimento_checklist recebimento_checklist_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recebimento_checklist
    ADD CONSTRAINT recebimento_checklist_pkey PRIMARY KEY (id);


--
-- Name: recebimentos recebimentos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recebimentos
    ADD CONSTRAINT recebimentos_pkey PRIMARY KEY (id);


--
-- Name: retida_historico retida_historico_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.retida_historico
    ADD CONSTRAINT retida_historico_pkey PRIMARY KEY (id);


--
-- Name: retida_notas retida_notas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.retida_notas
    ADD CONSTRAINT retida_notas_pkey PRIMARY KEY (id);


--
-- Name: retida_pecas retida_pecas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.retida_pecas
    ADD CONSTRAINT retida_pecas_pkey PRIMARY KEY (id);


--
-- Name: status_tags status_tags_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.status_tags
    ADD CONSTRAINT status_tags_name_key UNIQUE (name);


--
-- Name: status_tags status_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.status_tags
    ADD CONSTRAINT status_tags_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_name_key UNIQUE (name);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: ticket_eventos ticket_eventos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_eventos
    ADD CONSTRAINT ticket_eventos_pkey PRIMARY KEY (id);


--
-- Name: ticket_history ticket_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_history
    ADD CONSTRAINT ticket_history_pkey PRIMARY KEY (id);


--
-- Name: ticket_tags ticket_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_tags
    ADD CONSTRAINT ticket_tags_pkey PRIMARY KEY (ticket_id, tag_id);


--
-- Name: tickets tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);


--
-- Name: tickets uq_ticket_codigo; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT uq_ticket_codigo UNIQUE (codigo_interno);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: ix_audit_logs_criado_em; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_audit_logs_criado_em ON public.audit_logs USING btree (criado_em);


--
-- Name: ix_compras_numero_serie; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_compras_numero_serie ON public.compras USING btree (numero_serie);


--
-- Name: ix_gastos_ticket_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_gastos_ticket_id ON public.gastos_ticket USING btree (ticket_id);


--
-- Name: ix_kb_categoria; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_kb_categoria ON public.kb_artigos USING btree (categoria);


--
-- Name: ix_modelo_checklist_modelo_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_modelo_checklist_modelo_id ON public.modelo_checklist USING btree (modelo_id);


--
-- Name: ix_recebimento_checklist_recebimento_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_recebimento_checklist_recebimento_id ON public.recebimento_checklist USING btree (recebimento_id);


--
-- Name: ix_retida_historico_retida_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_retida_historico_retida_id ON public.retida_historico USING btree (retida_id);


--
-- Name: ix_retida_notas_retida_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_retida_notas_retida_id ON public.retida_notas USING btree (retida_id);


--
-- Name: ix_retida_pecas_retida_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_retida_pecas_retida_id ON public.retida_pecas USING btree (retida_id);


--
-- Name: ix_ticket_eventos_ticket; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_ticket_eventos_ticket ON public.ticket_eventos USING btree (ticket_id);


--
-- Name: attachments attachments_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_autor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_autor_id_fkey FOREIGN KEY (autor_id) REFERENCES public.users(id);


--
-- Name: tickets fk_ticket_defect; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT fk_ticket_defect FOREIGN KEY (defect_type_id) REFERENCES public.defect_types(id);


--
-- Name: tickets fk_ticket_desfecho; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT fk_ticket_desfecho FOREIGN KEY (desfecho_id) REFERENCES public.desfechos(id);


--
-- Name: tickets fk_ticket_responsavel; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT fk_ticket_responsavel FOREIGN KEY (responsavel_id) REFERENCES public.users(id);


--
-- Name: tickets fk_ticket_supplier; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT fk_ticket_supplier FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);


--
-- Name: gastos_ticket gastos_ticket_categoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gastos_ticket
    ADD CONSTRAINT gastos_ticket_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias_gasto(id);


--
-- Name: gastos_ticket gastos_ticket_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gastos_ticket
    ADD CONSTRAINT gastos_ticket_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id);


--
-- Name: impressoras_retidas impressoras_retidas_estado_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.impressoras_retidas
    ADD CONSTRAINT impressoras_retidas_estado_id_fkey FOREIGN KEY (estado_id) REFERENCES public.estados_retida(id);


--
-- Name: impressoras_retidas impressoras_retidas_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.impressoras_retidas
    ADD CONSTRAINT impressoras_retidas_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id);


--
-- Name: kb_artigos kb_artigos_autor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kb_artigos
    ADD CONSTRAINT kb_artigos_autor_id_fkey FOREIGN KEY (autor_id) REFERENCES public.users(id);


--
-- Name: modelo_checklist modelo_checklist_componente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.modelo_checklist
    ADD CONSTRAINT modelo_checklist_componente_id_fkey FOREIGN KEY (componente_id) REFERENCES public.checklist_componentes(id);


--
-- Name: modelo_checklist modelo_checklist_modelo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.modelo_checklist
    ADD CONSTRAINT modelo_checklist_modelo_id_fkey FOREIGN KEY (modelo_id) REFERENCES public.printer_models(id);


--
-- Name: printer_models printer_models_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.printer_models
    ADD CONSTRAINT printer_models_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.printer_brands(id);


--
-- Name: recebimento_checklist recebimento_checklist_recebimento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recebimento_checklist
    ADD CONSTRAINT recebimento_checklist_recebimento_id_fkey FOREIGN KEY (recebimento_id) REFERENCES public.recebimentos(id);


--
-- Name: recebimentos recebimentos_criado_por_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recebimentos
    ADD CONSTRAINT recebimentos_criado_por_id_fkey FOREIGN KEY (criado_por_id) REFERENCES public.users(id);


--
-- Name: recebimentos recebimentos_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recebimentos
    ADD CONSTRAINT recebimentos_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;


--
-- Name: retida_historico retida_historico_autor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.retida_historico
    ADD CONSTRAINT retida_historico_autor_id_fkey FOREIGN KEY (autor_id) REFERENCES public.users(id);


--
-- Name: retida_historico retida_historico_retida_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.retida_historico
    ADD CONSTRAINT retida_historico_retida_id_fkey FOREIGN KEY (retida_id) REFERENCES public.impressoras_retidas(id);


--
-- Name: retida_notas retida_notas_autor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.retida_notas
    ADD CONSTRAINT retida_notas_autor_id_fkey FOREIGN KEY (autor_id) REFERENCES public.users(id);


--
-- Name: retida_notas retida_notas_retida_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.retida_notas
    ADD CONSTRAINT retida_notas_retida_id_fkey FOREIGN KEY (retida_id) REFERENCES public.impressoras_retidas(id);


--
-- Name: retida_pecas retida_pecas_autor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.retida_pecas
    ADD CONSTRAINT retida_pecas_autor_id_fkey FOREIGN KEY (autor_id) REFERENCES public.users(id);


--
-- Name: retida_pecas retida_pecas_destino_retida_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.retida_pecas
    ADD CONSTRAINT retida_pecas_destino_retida_id_fkey FOREIGN KEY (destino_retida_id) REFERENCES public.impressoras_retidas(id);


--
-- Name: retida_pecas retida_pecas_destino_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.retida_pecas
    ADD CONSTRAINT retida_pecas_destino_ticket_id_fkey FOREIGN KEY (destino_ticket_id) REFERENCES public.tickets(id);


--
-- Name: retida_pecas retida_pecas_retida_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.retida_pecas
    ADD CONSTRAINT retida_pecas_retida_id_fkey FOREIGN KEY (retida_id) REFERENCES public.impressoras_retidas(id);


--
-- Name: ticket_eventos ticket_eventos_autor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_eventos
    ADD CONSTRAINT ticket_eventos_autor_id_fkey FOREIGN KEY (autor_id) REFERENCES public.users(id);


--
-- Name: ticket_eventos ticket_eventos_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_eventos
    ADD CONSTRAINT ticket_eventos_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;


--
-- Name: ticket_history ticket_history_from_column_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_history
    ADD CONSTRAINT ticket_history_from_column_id_fkey FOREIGN KEY (from_column_id) REFERENCES public.columns(id);


--
-- Name: ticket_history ticket_history_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_history
    ADD CONSTRAINT ticket_history_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;


--
-- Name: ticket_history ticket_history_to_column_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_history
    ADD CONSTRAINT ticket_history_to_column_id_fkey FOREIGN KEY (to_column_id) REFERENCES public.columns(id);


--
-- Name: ticket_tags ticket_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_tags
    ADD CONSTRAINT ticket_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.status_tags(id) ON DELETE CASCADE;


--
-- Name: ticket_tags ticket_tags_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_tags
    ADD CONSTRAINT ticket_tags_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;


--
-- Name: tickets tickets_column_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_column_id_fkey FOREIGN KEY (column_id) REFERENCES public.columns(id);


--
-- Name: tickets tickets_printer_model_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_printer_model_id_fkey FOREIGN KEY (printer_model_id) REFERENCES public.printer_models(id);


--
-- PostgreSQL database dump complete
--

\unrestrict VFqWaqNcJbTwEjMWomfmJzOiIPmyAv59HuclNLymVLrOe5DEszdN8vuh0AxcX19

