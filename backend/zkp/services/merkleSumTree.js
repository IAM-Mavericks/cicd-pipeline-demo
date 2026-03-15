const { buildPoseidon } = require('circomlibjs');

class MerkleSumTree {
    /**
     * @param {Array} users - Array of { id, balance } objects
     * @param {number} levels - Height of the tree
     */
    constructor(users, levels = 10) {
        this.users = users;
        this.levels = levels;
        this.capacity = Math.pow(2, levels);
        this.poseidon = null;
        this.tree = [];
    }

    async init() {
        this.poseidon = await buildPoseidon();
        await this._buildTree();
    }

    /**
     * Build the Merkle Sum Tree
     * Each node in the tree stores { hash, sum }
     */
    async _buildTree() {
        console.log(`🌳 Building Merkle Sum Tree with ${this.levels} levels...`);

        // 1. Prepare leaves
        const leaves = [];
        for (let i = 0; i < this.capacity; i++) {
            if (i < this.users.length) {
                const u = this.users[i];
                // Convert ID to a field element (e.g., using BigInt)
                // For demo, we'll assume ID is a numeric string or we'll hash it if it's a UUID
                const userIdField = this._idToField(u.id);
                const hash = this.poseidon.F.toObject(this.poseidon([userIdField, BigInt(u.balance)]));
                leaves.push({ hash, sum: BigInt(u.balance) });
            } else {
                // Empty leaf
                leaves.push({ hash: 0n, sum: 0n });
            }
        }

        this.tree = [leaves];

        // 2. Build layers
        for (let level = 0; level < this.levels; level++) {
            const prevLayer = this.tree[level];
            const currentLayer = [];

            for (let i = 0; i < prevLayer.length; i += 2) {
                const left = prevLayer[i];
                const right = prevLayer[i + 1];

                const parentSum = left.sum + right.sum;
                const parentHash = this.poseidon.F.toObject(
                    this.poseidon([left.hash, left.sum, right.hash, right.sum])
                );

                currentLayer.push({ hash: parentHash, sum: parentSum });
            }
            this.tree.push(currentLayer);
        }

        console.log('✅ Merkle Sum Tree built successfully');
    }

    /**
     * Get the root of the tree
     */
    getRoot() {
        const root = this.tree[this.levels][0];
        return {
            hash: root.hash.toString(),
            sum: root.sum.toString()
        };
    }

    /**
     * Get an inclusion proof for a user by index
     */
    getProof(index) {
        if (index < 0 || index >= this.users.length) {
            throw new Error('Invalid user index');
        }

        const pathElements = [];
        const pathIndices = [];
        const siblingSums = [];

        let currentIndex = index;
        for (let level = 0; level < this.levels; level++) {
            const isRightChild = currentIndex % 2 === 1;
            const siblingIndex = isRightChild ? currentIndex - 1 : currentIndex + 1;

            const sibling = this.tree[level][siblingIndex];
            pathElements.push(sibling.hash.toString());
            pathIndices.push(isRightChild ? 1 : 0);
            siblingSums.push(sibling.sum.toString());

            currentIndex = Math.floor(currentIndex / 2);
        }

        const user = this.users[index];
        return {
            userId: this._idToField(user.id).toString(),
            balance: user.balance.toString(),
            pathElements,
            pathIndices,
            siblingSums
        };
    }

    /**
     * Convert userId to a field element
     */
    _idToField(id) {
        // If it's a UUID or string, we hash it to fit in the field
        if (typeof id === 'string') {
            // Simple hash-to-field for demo
            let hash = 0n;
            for (let i = 0; i < id.length; i++) {
                hash = (hash << 8n) + BigInt(id.charCodeAt(i));
            }
            return hash % 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
        }
        return BigInt(id);
    }
}

module.exports = MerkleSumTree;
