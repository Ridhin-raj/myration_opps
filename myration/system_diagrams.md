# System & Architectural Diagrams: MyRation

## 1. Full Entity-Relationship (ER) Diagram
This is the complete, holistic mapping of the MySQL database schema. It explicitly details the attributes within every table, including foreign keys (`FK`) mapping logic, enumerations, primary keys (`PK`), and relational constraints.

```mermaid
erDiagram
    USERS {
        int id PK
        string username "UNIQUE"
        string password "Hashed"
        enum role "user, shopkeeper, admin"
        string name
        string mobile
        string aadhaar
        enum status "pending, approved, rejected"
        timestamp created_at
    }

    SHOPS {
        int id PK
        int owner_id FK "References USERS(id)"
        string shop_name
        string license_no
        int capacity
        string state
        string district
        string taluk
        string village
        string pincode
        boolean is_open
        enum status "pending, approved"
    }

    USER_PROFILES {
        int id PK
        int user_id FK
        date dob
        enum gender "Male, Female, Other"
        string ration_card_no "UNIQUE"
        enum card_type "APL, BPL, AAY, PHH"
        int family_members
        string ration_card_image
        string state
        string pincode
        int assigned_shop_id FK
        boolean verified_by_shopkeeper
        boolean verified_by_admin
    }

    STOCK {
        int id PK
        int shop_id FK
        string item_name
        decimal allocated_qty
        decimal distributed_qty
        string unit "kg/ltr"
        string month_year "e.g., 4-2026"
        timestamp last_updated
    }

    ASSIGNED_STOCK {
        int id PK
        int shop_id FK
        string item_name
        decimal quantity
        enum status "PENDING, VERIFIED"
        string month_year
        timestamp created_at
    }

    QUOTA {
        int id PK
        enum card_type "APL/BPL/AAY/PHH"
        string item_name "Rice/Dal/Sugar"
        string quantity
        string price
    }

    USER_BALANCES {
        int id PK
        int user_id FK
        string item_name
        decimal total_quota
        decimal remaining_quota
        string month_year "Month binding"
    }

    QUOTA_HISTORY {
        int id PK
        int user_id FK
        int shop_id FK
        enum action_type "COLLECTED"
        string item_name
        decimal amount
        decimal remaining_quota
        decimal total_quota
        timestamp timestamp
    }

    STOCK_HISTORY {
        int id PK
        int shop_id FK
        string item_name
        enum action_type "ADDED, DISTRIBUTED"
        decimal quantity
        int user_id FK "Nullable"
        timestamp timestamp
    }

    COMPLAINTS {
        int id PK
        int user_id FK
        int shop_id FK
        string complaint_type
        text message
        enum status "pending, resolved"
        text admin_response
    }

    ALERTS {
        int id PK
        int user_id FK
        int shop_id FK
        string message
        enum alert_type
        boolean is_read
    }

    %% Constraints
    USERS ||--o| USER_PROFILES : "Extends Profile"
    USERS ||--o{ SHOPS : "Manages (owner_id)"
    SHOPS ||--o{ USER_PROFILES : "Serves Beneficiaries"
    SHOPS ||--o{ STOCK : "Inventory per month"
    SHOPS ||--o{ ASSIGNED_STOCK : "Receives shipments"
    USERS ||--o{ USER_BALANCES : "Holds monthly quota"
    USERS ||--o{ QUOTA_HISTORY : "Collection audit"
    SHOPS ||--o{ QUOTA_HISTORY : "Origin of collection"
    SHOPS ||--o{ STOCK_HISTORY : "Inventory audit"
    USERS ||--o{ COMPLAINTS : "Lodges"
    SHOPS ||--o{ COMPLAINTS : "Target of"
    USERS ||--o{ ALERTS : "Receives"
    SHOPS ||--o{ ALERTS : "Receives"
```

---

## 2. Data Flow Diagrams (DFD)

The Data Flow Diagrams dissect the application processes into hierarchical levels, moving from a broad system overview down to atomic backend logic.

### 2.1 Level 0 DFD (Context Level)
The Context Diagram defines the macro-environment. It visualizes the entire "Smart Ration Management System" (SRMS) as a single monolithic node and illustrates only the boundaries and interactions with external entities.

```mermaid
flowchart TD
    Admin([District Admin])
    Shopkeeper([Shopkeeper / FPS])
    Citizen([Beneficiary Citizen])
    
    System((Smart Ration\nManagement System))
    
    Admin -->|Approve Shops/Users\nGlobal Quota Adjustments\nBulk Ship Stocks| System
    System -->|System Statistics\nDemand Analytics\nPending Complaint Alerts| Admin
    
    Shopkeeper -->|Initial Registration\nVerify Incoming Users\nReceive Admin Shipments\nExecute Physical Sales| System
    System -->|Pending Admin Deliveries\nShop Inventory Status| Shopkeeper
    
    Citizen -->|Register via Aadhaar\nBook Pickup Slots\nFile Complaints\nMonitor Quota Balance| System
    System -->|Approval Status Updates\nMonthly Allowance Data\nTransaction Receipts| Citizen
```

### 2.2 Level 1 DFD (Subsystem Processing Level)
Level 1 decomposes the central node heavily into 4 independent operational modules that carry data back and forth to central data pools.

```mermaid
flowchart TD
    %% External Entities
    E1([District Admin])
    E2([Shopkeeper])
    E3([Beneficiary])

    %% Level 1 Global Processes
    P1((1.0\nAuth & Registration))
    P2((2.0\nAlgorithmic Supply Push))
    P3((3.0\nInventory Sync & Verification))
    P4((4.0\nRation Distribution Loop))

    %% Consolidated Data Stores
    D1[(System Entities DB:\nUsers, Profiles, Shops)]
    D2[(Logistics DB:\nStock, Transit, Balances)]

    %% Auth Flow
    E3 -->|Register Credentials| P1
    E2 -->|Register FPS Details| P1
    P1 -->|Write New Entries| D1
    E1 -->|Trigger 'Approved' Status| P1
    
    %% Supply Chain Algorithm
    E1 -->|Trigger Monthly Analysis| P2
    P2 <-->|Count Active Card Users| D1
    P2 <-->|Read Previous Month Surplus| D2
    P2 -->|Save Net 'PENDING' Transit | D2
    
    %% Shop Sync
    E2 -->|Monitor Incoming Shipments| P3
    P3 <-->|Fetch 'PENDING' Assignments| D2
    E2 -->|Accept Delivery| P3
    P3 -->|Resolve UPSERT to Stock| D2
    
    %% Beneficiary Collection
    E3 -->|Request Monthly Quota| P4
    P4 <-->|Query user_balances| D2
    E2 -->|Trigger Sale via Username/Amt| P4
    P4 -->|Subtract from Shop Stock| D2
    P4 -->|Subtract from User Balance| D2
```

### 2.3 Level 2 DFDs (Atomic Processes)
Microscopic views detailing the internal architecture of each isolated subsystem module.

#### 2.3.1 Process 1.0: Auth & Registration
```mermaid
flowchart TD
    Beneficiary([Beneficiary])
    Shopkeeper([Shopkeeper])
    Admin([District Admin])

    P11["1.1 Submit Beneficiary Profile"]
    P12["1.2 Submit Shopkeeper Registration"]
    P13["1.3 Hash Password & Store Data"]
    P14["1.4 Shopkeeper Local Verification"]
    P15["1.5 Admin Final Approval"]

    D_Users[("DB: users & user_profiles")]
    D_Shops[("DB: shops")]

    Beneficiary -->|Details & Aadhaar| P11
    Shopkeeper -->|Shop Details & License| P12

    P11 --> P13
    P12 --> P13
    
    P13 -->|INSERT User Status: Pending| D_Users
    P13 -->|INSERT Shop Status: Pending| D_Shops

    Shopkeeper -->|Verify Assigned Users| P14
    P14 -->|UPDATE verified_by_sk=TRUE| D_Users

    Admin -->|Review Pending List| P15
    P15 -->|UPDATE User Status=Approved| D_Users
    P15 -->|UPDATE Shop Status=Approved| D_Shops
```

#### 2.3.2 Process 2.0: Algorithmic Supply Push
```mermaid
flowchart TD
    Admin([District Admin])

    P21["2.1 Query Active Users mapped to Shop"]
    P22["2.2 Multiply by Card Type Quotas"]
    P23["2.3 Query Previous Month Surplus"]
    P24["2.4 Calculate Net Shipment Suggestion"]
    P25["2.5 Execute Stock Assignment"]

    D_Users[("DB: user_profiles")]
    D_Stock[("DB: stock (prev month)")]
    D_Quota[("DB: quota logic")]
    D_Transit[("DB: assigned_stock")]

    Admin -->|Request Demand| P21
    P21 <-->|Fetch 'Approved' Cards| D_Users
    P21 --> P22 <-->|Fetch Multipliers| D_Quota
    P22 -->|Gross Demand| P23
    P23 <-->|Fetch (Allocated-Distributed)| D_Stock
    P23 --> P24
    P24 -->|Net Suggested Shipment| Admin

    Admin -->|Confirm Allocation| P25
    P25 -->|INSERT Status='PENDING' + MM-YYYY| D_Transit
```

#### 2.3.3 Process 3.0: Inventory Sync & Verification
```mermaid
flowchart TD
    Shopkeeper([Shopkeeper])

    P31["3.1 Fetch 'PENDING' Shipments"]
    P32["3.2 Physical Intake & Verification"]
    P33["3.3 Atomic UPSERT to Shop Ledger"]
    P34["3.4 Generate Inventory Audit Log"]

    D_Transit[("DB: assigned_stock")]
    D_Stock[("DB: stock (current month)")]
    D_Hist[("DB: stock_history")]

    Shopkeeper -->|View Dashboard| P31
    P31 <-->|Filter by MM-YYYY| D_Transit
    
    P31 -->|Pending List| Shopkeeper
    Shopkeeper -->|Click 'Verify & Receive'| P32
    
    P32 -->|UPDATE Status='VERIFIED'| D_Transit
    P32 --> P33
    P33 -->|INSERT or UPDATE allocated_qty| D_Stock
    P33 --> P34
    P34 -->|INSERT 'ADDED' Event| D_Hist
```

#### 2.3.4 Process 4.0: Ration Distribution Loop
```mermaid
flowchart TD
    Input(["API: /collect-ration [UserID, Item, Amount]"])
    Beneficiary([Beneficiary Citizen])
    Shopkeeper([Shopkeeper / FPS])
    
    Beneficiary -->|Presents ID & Requests Ration| Shopkeeper
    Shopkeeper -->|Authorizes & Submits| Input
    
    P41["4.1 Validate Identity Binding"]
    P42["4.2 Interrogate 'user_balances' MM-YYYY"]
    P43["4.3 Interrogate 'stock' capacity"]
    P44["4.4 Execute Atomic SQL Updates"]
    P45["4.5 Push Immutable Audit Logs"]
    
    D_Users[("DB: user_profiles")]
    D_Bal[("DB: user_balances")]
    D_Stock[("DB: stock")]
    D_Hist[("DB: audit_logs")]

    Input --> P41 <--> D_Users
    P41 -->|Authorized | P42 <--> D_Bal
    P42 -->|Quota Valid| P43 <--> D_Stock
    P43 -->|Stock Valid| P44 -->|UPDATE (-)| D_Bal & D_Stock
    P44 --> P45 -->|INSERT| D_Hist
    P45 --> Output(["Output: Ration Disbursed"])
    
    Output -->|Updates Balance & Hands over Goods| Beneficiary
    
    P41 -.->|Fails| Reject1(["Abort: 403 Security"])
    P42 -.->|Fails| Reject2(["Abort: 400 Quota"])
    P43 -.->|Fails| Reject3(["Abort: 400 Stock"])
```
