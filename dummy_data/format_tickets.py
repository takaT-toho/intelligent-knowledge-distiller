import json
import sys
import os

def format_tickets(input_file, output_file):
    """
    Reads a JSON file containing a list of tickets,
    and writes them to a text file, separated by a delimiter.
    """
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            tickets = json.load(f)

        with open(output_file, 'w', encoding='utf-8') as f:
            for i, ticket in enumerate(tickets):
                # Convert each ticket object to a formatted JSON string
                ticket_str = json.dumps(ticket, indent=2, ensure_ascii=False)
                f.write(ticket_str)
                
                # Add a delimiter after each ticket except the last one
                if i < len(tickets) - 1:
                    f.write('\n\n--- TICKET BREAK ---\n\n')

        print(f"Successfully formatted tickets from '{input_file}' and saved to '{output_file}'")

    except FileNotFoundError:
        print(f"Error: The file '{input_file}' was not found.")
    except json.JSONDecodeError:
        print(f"Error: Could not decode JSON from the file '{input_file}'.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python format_tickets.py <input_json_file>")
        sys.exit(1)

    input_json_file = sys.argv[1]
    
    # Create an output filename based on the input filename
    base_name = os.path.splitext(input_json_file)[0]
    output_text_file = f"formatted_{base_name}.txt"
    
    format_tickets(input_json_file, output_text_file)
