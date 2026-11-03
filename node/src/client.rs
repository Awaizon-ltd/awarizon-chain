//! Shared client/backend type aliases — split out from `service.rs` (which
//! used to define these inline) so `eth.rs` can reference them without a
//! circular module dependency, matching sysfi-node's structure.

use solochain_template_runtime::{apis::RuntimeApi, opaque::Block};

/// `sp_io::SubstrateHostFunctions` alone used to be enough; adding
/// `cumulus_primitives_proof_size_hostfunction` is what `frame_system::
/// WeightReclaim` (already in the runtime's `TxExtension`, now also
/// required by Frontier's own `TxExtension` additions) needs to resolve
/// proof-size at runtime — without it the node refuses to load the wasm
/// blob.
pub type HostFunctions =
	(sp_io::SubstrateHostFunctions, cumulus_primitives_proof_size_hostfunction::storage_proof_size::HostFunctions);

pub type FullClient = sc_service::TFullClient<Block, RuntimeApi, sc_executor::WasmExecutor<HostFunctions>>;
pub type FullBackend = sc_service::TFullBackend<Block>;
