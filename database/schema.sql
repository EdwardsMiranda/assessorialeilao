-- ============================================
-- SCHEMA DO BANCO DE DADOS - SISTEMA DE LEILÕES
-- ============================================

-- Tabela de Usuários
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Gestor', 'Analista')),
    avatar TEXT,
    blocked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Clientes (CRM)
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    investment_thesis JSONB NOT NULL, -- {cities: [], maxBidValue: number, propertyTypes: [], notes: string}
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Propriedades
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT NOT NULL,
    modality VARCHAR(100) NOT NULL,
    auction_date DATE,
    status VARCHAR(50) NOT NULL CHECK (status IN ('Não Iniciado', 'Em Análise', 'Analisado', 'Abortado', 'Arrematado', 'Perdida')),
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    added_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500),
    notes TEXT,
    abort_reason TEXT,
    ai_analysis TEXT,
    
    -- Dados de gestão
    manager_dispatch JSONB, -- {recipient: string, clientId: string, sent: boolean}
    
    -- Controle de edição e venda
    last_edited_at TIMESTAMP,
    sold_date DATE,
    sold_amount DECIMAL(15, 2),
    buyer_name VARCHAR(255),
    
    -- Timestamps
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Dados de Análise da Propriedade
CREATE TABLE property_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID UNIQUE NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    
    -- Informações Básicas
    city_state VARCHAR(255),
    condo_name VARCHAR(255),
    address TEXT,
    payment_method VARCHAR(255),
    modality VARCHAR(100),
    event_date DATE,
    initial_bid DECIMAL(15, 2),
    bank_valuation DECIMAL(15, 2),
    financing VARCHAR(255),
    bank_mirror TEXT,
    payment_print TEXT,
    private_area DECIMAL(10, 2),
    condo_debt_rule BOOLEAN,
    edital_link TEXT,
    homologation_date DATE,
    auction_lot_link TEXT,
    
    -- Análise de Matrícula
    critical_impediment TEXT,
    bank_consolidation TEXT,
    cpf_critical_nature TEXT,
    cpf_propter_rem TEXT,
    cpf_search_print TEXT,
    matricula_file TEXT,
    waiting_lawyer BOOLEAN DEFAULT FALSE,
    
    -- Análise de Localidade
    loc_asphalt_quality TEXT,
    loc_rural TEXT,
    loc_remote TEXT,
    loc_favela TEXT,
    loc_good_appearance TEXT,
    loc_public_transport TEXT,
    loc_commerce TEXT,
    loc_health_education TEXT,
    loc_leisure TEXT,
    loc_differential TEXT,
    
    -- Calculadora de Mercado
    rent_value DECIMAL(15, 2),
    rent_print TEXT,
    comparables JSONB, -- Array de {link: string, value: number, area: number}
    condo_fee DECIMAL(15, 2),
    
    -- Calculadora Financeira
    venal_value DECIMAL(15, 2),
    itbi_rate DECIMAL(5, 2),
    registry_value DECIMAL(15, 2),
    renovation_value DECIMAL(15, 2),
    condo_debt DECIMAL(15, 2),
    iptu_debt DECIMAL(15, 2),
    iptu_debt_print TEXT,
    
    -- Financiamento
    financing_rate DECIMAL(5, 2),
    financing_term INTEGER,
    sales_period INTEGER,
    max_bid DECIMAL(15, 2),
    
    -- Estimativa IPTU
    last_owner_registry_date DATE,
    monthly_iptu DECIMAL(15, 2),
    
    -- Métricas Finais
    final_roi DECIMAL(10, 2),
    final_net_profit DECIMAL(15, 2),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para melhor performance
CREATE INDEX idx_properties_status ON properties(status);
CREATE INDEX idx_properties_assigned_to ON properties(assigned_to);
CREATE INDEX idx_properties_auction_date ON properties(auction_date);
CREATE INDEX idx_properties_added_by ON properties(added_by);
CREATE INDEX idx_property_analysis_property_id ON property_analysis(property_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_clients_name ON clients(name);

-- Triggers para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_property_analysis_updated_at BEFORE UPDATE ON property_analysis
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserir usuários iniciais (senhas devem ser hasheadas no backend)
INSERT INTO users (name, email, password_hash, role, avatar) VALUES
('Carlos Gestor', 'admin@leilao.com', '$2b$10$placeholder_hash_admin', 'Gestor', 'https://picsum.photos/seed/u1/40'),
('Ana Analista', 'ana@leilao.com', '$2b$10$placeholder_hash_ana', 'Analista', 'https://picsum.photos/seed/u2/40');
