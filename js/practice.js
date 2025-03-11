document.addEventListener('DOMContentLoaded', function() {
    const gameGrid = document.getElementById('game-grid');
    const numberOfImages = 12; // Adjust this number based on how many game images you have
    const itemsPerRow = 4;
    let loadedItems = 0;
    let processedItems = 0;
    
    // Calculate optimal image height based on screen width
    const calculateOptimalHeight = () => {
        const gridWidth = gameGrid.clientWidth;
        const columnWidth = (gridWidth - (20 * (itemsPerRow - 1))) / itemsPerRow; // Accounting for gaps
        return (columnWidth * 9) / 16; // 16:9 aspect ratio
    };
    
    let optimalHeight = calculateOptimalHeight();
    
    // Recalculate on window resize
    window.addEventListener('resize', () => {
        optimalHeight = calculateOptimalHeight();
        document.querySelectorAll('.placeholder').forEach(placeholder => {
            placeholder.style.height = `${optimalHeight}px`;
        });
    });
    
    for (let i = 1; i <= numberOfImages; i++) {
        const gameItem = document.createElement('div');
        gameItem.className = 'game-item';
        
        const img = document.createElement('img');
        img.src = `images/games/game_${i}.jpg`;
        img.alt = `Typography Game ${i}`;
        
        img.onload = function() {
            loadedItems++;
            processedItems++;
            if (processedItems >= numberOfImages) {
                addPlaceholdersIfNeeded();
            }
        };
        
        img.onerror = function() {
            // If jpg fails, try png
            this.src = `images/games/game_${i}.png`;
            
            // If png also fails
            this.onerror = function() {
                gameItem.remove();
                processedItems++;
                if (processedItems >= numberOfImages) {
                    addPlaceholdersIfNeeded();
                }
            };
        };
        
        gameItem.appendChild(img);
        gameGrid.appendChild(gameItem);
    }
    
    function addPlaceholdersIfNeeded() {
        // Get current number of items actually displayed in the grid
        const currentItems = document.querySelectorAll('#game-grid .game-item').length;
        
        // Calculate how many placeholders we need to complete the last row
        const remainingSpots = itemsPerRow - (currentItems % itemsPerRow);
        if (remainingSpots === itemsPerRow) return; // Row is complete, no placeholders needed
        
        console.log(`Adding ${remainingSpots} placeholders to complete the row`);
        
        const placeholderMessages = [
            "Coming Soon",
            "In Development",
            "Stay Tuned",
            "New Game Coming"
        ];
        
        // Add placeholder items
        for (let i = 0; i < remainingSpots; i++) {
            const placeholderItem = document.createElement('div');
            placeholderItem.className = 'game-item placeholder';
            placeholderItem.style.height = `${optimalHeight}px`;
            
            const placeholderContent = document.createElement('div');
            placeholderContent.className = 'placeholder-content';
            placeholderContent.textContent = placeholderMessages[i % placeholderMessages.length];
            
            placeholderItem.appendChild(placeholderContent);
            gameGrid.appendChild(placeholderItem);
        }
    }
    
    // Fallback check in case some images don't trigger events
    window.addEventListener('load', function() {
        setTimeout(function() {
            if (processedItems < numberOfImages) {
                console.log("Fallback: Adding placeholders after timeout");
                processedItems = numberOfImages;
                addPlaceholdersIfNeeded();
            }
        }, 2000); // Wait 2 seconds after page load
    });
});
