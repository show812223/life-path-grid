use tauri_plugin_sql::{Migration, MigrationKind};

fn cobie_migrations() -> Vec<Migration> {
  vec![Migration {
    version: 1,
    description: "create cobie tables",
    sql: r#"
      CREATE TABLE IF NOT EXISTS components (
        modelId TEXT NOT NULL,
        externalId TEXT NOT NULL,
        dbId INTEGER NOT NULL,
        name TEXT NOT NULL,
        typeName TEXT,
        space TEXT,
        systemName TEXT,
        description TEXT,
        serialNumber TEXT,
        installationDate TEXT,
        warrantyStartDate TEXT,
        tagNumber TEXT,
        barCode TEXT,
        assetIdentifier TEXT,
        area REAL,
        length REAL,
        raw TEXT,
        PRIMARY KEY (modelId, externalId)
      );
      CREATE INDEX IF NOT EXISTS idx_components_model ON components(modelId);
      CREATE INDEX IF NOT EXISTS idx_components_type ON components(modelId, typeName);
      CREATE INDEX IF NOT EXISTS idx_components_space ON components(modelId, space);
      CREATE INDEX IF NOT EXISTS idx_components_system ON components(modelId, systemName);

      CREATE TABLE IF NOT EXISTS types (
        modelId TEXT NOT NULL,
        name TEXT NOT NULL,
        category TEXT,
        description TEXT,
        assetType TEXT,
        manufacturer TEXT,
        modelNumber TEXT,
        warrantyGuarantorParts TEXT,
        warrantyDurationParts REAL,
        warrantyDurationLabor REAL,
        warrantyDurationUnit TEXT,
        replacementCost REAL,
        expectedLife REAL,
        durationUnit TEXT,
        nominalLength REAL,
        nominalWidth REAL,
        nominalHeight REAL,
        raw TEXT,
        PRIMARY KEY (modelId, name)
      );
      CREATE INDEX IF NOT EXISTS idx_types_model ON types(modelId);

      CREATE TABLE IF NOT EXISTS spaces (
        modelId TEXT NOT NULL,
        name TEXT NOT NULL,
        category TEXT,
        floorName TEXT,
        zoneName TEXT,
        description TEXT,
        grossArea REAL,
        netArea REAL,
        externalId TEXT,
        raw TEXT,
        PRIMARY KEY (modelId, name)
      );
      CREATE INDEX IF NOT EXISTS idx_spaces_model ON spaces(modelId);
      CREATE INDEX IF NOT EXISTS idx_spaces_floor ON spaces(modelId, floorName);
      CREATE INDEX IF NOT EXISTS idx_spaces_zone ON spaces(modelId, zoneName);

      CREATE TABLE IF NOT EXISTS floors (
        modelId TEXT NOT NULL,
        name TEXT NOT NULL,
        category TEXT,
        description TEXT,
        elevation REAL,
        height REAL,
        externalId TEXT,
        raw TEXT,
        PRIMARY KEY (modelId, name)
      );
      CREATE INDEX IF NOT EXISTS idx_floors_model ON floors(modelId);

      CREATE TABLE IF NOT EXISTS systems (
        modelId TEXT NOT NULL,
        name TEXT NOT NULL,
        category TEXT,
        description TEXT,
        componentExternalIds TEXT,
        declaredComponentNames TEXT,
        raw TEXT,
        PRIMARY KEY (modelId, name)
      );
      CREATE INDEX IF NOT EXISTS idx_systems_model ON systems(modelId);

      CREATE TABLE IF NOT EXISTS zones (
        modelId TEXT NOT NULL,
        name TEXT NOT NULL,
        category TEXT,
        description TEXT,
        spaceNames TEXT,
        raw TEXT,
        PRIMARY KEY (modelId, name)
      );
      CREATE INDEX IF NOT EXISTS idx_zones_model ON zones(modelId);

      CREATE TABLE IF NOT EXISTS facilities (
        modelId TEXT PRIMARY KEY,
        name TEXT,
        projectName TEXT,
        siteName TEXT,
        raw TEXT
      );

      CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        modelId TEXT NOT NULL,
        name TEXT,
        raw TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_documents_model ON documents(modelId);

      CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        modelId TEXT NOT NULL,
        email TEXT,
        company TEXT,
        raw TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_contacts_model ON contacts(modelId);

      CREATE TABLE IF NOT EXISTS attributes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        modelId TEXT NOT NULL,
        sheetName TEXT,
        rowName TEXT,
        name TEXT,
        value TEXT,
        unit TEXT,
        category TEXT,
        description TEXT,
        raw TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_attributes_model ON attributes(modelId);
      CREATE INDEX IF NOT EXISTS idx_attributes_target ON attributes(modelId, sheetName, rowName);

      CREATE TABLE IF NOT EXISTS sheetRows (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        modelId TEXT NOT NULL,
        sheetName TEXT NOT NULL,
        rowIndex INTEGER NOT NULL,
        raw TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sheetrows_model ON sheetRows(modelId);
      CREATE INDEX IF NOT EXISTS idx_sheetrows_sheet ON sheetRows(modelId, sheetName);

      CREATE TABLE IF NOT EXISTS meta (
        modelId TEXT PRIMARY KEY,
        modelName TEXT,
        extractedAt TEXT NOT NULL,
        source TEXT NOT NULL,
        componentCount INTEGER NOT NULL DEFAULT 0,
        typeCount INTEGER NOT NULL DEFAULT 0,
        spaceCount INTEGER NOT NULL DEFAULT 0,
        floorCount INTEGER NOT NULL DEFAULT 0,
        systemCount INTEGER NOT NULL DEFAULT 0,
        zoneCount INTEGER NOT NULL DEFAULT 0,
        totalDbIds INTEGER NOT NULL DEFAULT 0,
        facilityCount INTEGER,
        documentCount INTEGER,
        contactCount INTEGER,
        attributeCount INTEGER,
        extraSheetCount INTEGER
      );
    "#,
    kind: MigrationKind::Up,
  }]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(
      tauri_plugin_sql::Builder::default()
        .add_migrations("sqlite:cobie.db", cobie_migrations())
        .build(),
    )
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
