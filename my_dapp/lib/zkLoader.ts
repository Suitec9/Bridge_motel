let _buildBabyjub: any = null;
let _buildPoseidon: any = null;
let _buildPedersenHash: any = null;
let _babyJub: any = null;

export async function loadZKLibraries() {
    if (!_buildBabyjub) {
        const { buildBabyjub } = await import("circomlibjs");
        _buildBabyjub = buildBabyjub;  
    }

    if (!_buildPoseidon) {
        const { buildPoseidon } = await import("circomlibjs");
        _buildPoseidon = buildPoseidon;
    }

    if (!_buildPedersenHash) {
        const { buildPedersenHash } = await import("circomlibjs");
        _buildPedersenHash = buildPedersenHash;
    }

    if (!_babyJub) {
        const { babyJub } = await import("@iden3/js-crypto");
        _babyJub = babyJub;
    }

    return {
        buildBabyjub: _buildBabyjub,
        buildPoseidon: _buildPoseidon,
        buildPedersenHash: _buildPedersenHash,
        babyJub: _babyJub
    };
}