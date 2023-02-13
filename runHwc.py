import sys

def get_string_length(string):
    return len(string)

if __name__ == '__main__':
    string = sys.argv[1]
    print(get_string_length(string))